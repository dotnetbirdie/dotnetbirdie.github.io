var query = new URLSearchParams(window.location.search || 'q=').get('q');
if (query && query.length > 0) {
    document.getElementById('global-search-input').value = query;
}

var resultsDiv = document.getElementById('search-results');

// for dev we support to load all data from the HTTP response but at runtime
// we should consume a pre-computed index
function createIndex(data) {
    // this code should stay aligned with src/_build/flexsearch/index.mjs
    const index = new FlexSearch.Document({
        tokenize: 'forward',
        language: 'en',
        cache: 1000,
        optimize: true,
        encoder: 'extra',
        document: {
            id: 'slug',
            index: ['title', 'description', 'body', 'summary'],
            store: ['slug', 'title', 'description', 'publishedOn', 'summary', 'tags', 'gravatar', 'author', 'authorDisplayName', 'postImage']
        },
    });

    if (data.exported) { // pre-built index
        Object.entries(data.exported).forEach(([key, value]) => index.import(key, value));
        return index;
    }

    (console.warn || console.log)('Initializing the index in the browser');

    const items = data.items || [];
    items.forEach(it => {
        var attrs = it.attributes || {};
        return index.add({
            slug: it.slug,
            title: it.title,
            description: it.description,
            body: it.body,
            publishedOn: attrs.publishedon,
            summary: attrs.summary,
            tags: attrs.tags,
            gravatar: attrs.gravatar,
            author: attrs.author,
            authorDisplayName: !attrs['author-displayName'] || attrs['author-displayName'].length == 0 ? attrs.author : attrs['author-displayName'],
            postImage: !attrs['post-image'] || attrs['post-image'].length == 0 ? '/img/default-post.png' : attrs['post-image'],
        });
    });

    return index;
}

// 1-1 with post.index.cshtml
function renderPost(post) {
    const article = document.createElement('div');
    article.innerHTML = `
            <article class="post">
                <div class="card w-100 p-2 mt-2">
                    <div class="card-body d-flex">
                        <div class="card-body-img">
                            <div class="d-none d-sm-block pe-4">
                                <img style="max-height: 204px; object-fit: scale-down; border-radius: 0.5rem;" class="card-img-top">
                            </div>
                        </div>
                        <div class="card-body-content">
                            <h5 class="card-title" style="color: #005da6;line-height: 26px;: 1.25rem;text-decoration: none;">
                                <a href="#" class="post-link"></a>
                            </h5>
                            <div style="font-size: 1rem;text-decoration: none;" class="post-date"></div>
                            <div class="pt-2">
                                <img width="36" height="36" src="" class="w-auto card-img-top" alt="" style="border-radius: 100px;">
                                <a href="" class="author-link" style="color: #005da6;font-weight: 600;text-decoration: none;"></a>
                            </div>
                            <p class="pt-2 card-text"></p>
                        </div>
                    </div>
            </article>`;

    var postImg = article.querySelector('.card-body-img img');
    postImg.src = post.postImage;
    postImg.alt = post.postImage.substring(post.postImage.lastIndexOf('/') + 1);

    var titleLink = article.querySelector('.post-link');
    titleLink.href = `/${post.slug}.html`;
    titleLink.innerText = post.title;

    var date = new Date(post.publishedOn);
    let dateValue = '';
    try { // same as in post.index.cshtml
        dateValue = date.toLocaleDateString('en-us', { year: "numeric", month: "numeric", day: "numeric" });
    } catch (e) { // else not a big deal, format will just be a bit different
        dateValue = date.toLocaleDateString();
    }
    article.querySelector('.post-date').innerText = dateValue;

    var img = article.querySelector('.card-body-content img');
    img.src = `${post.gravatar}&s=36`;
    img.alt = post.author;

    var authorLink = article.querySelector('.author-link');
    authorLink.href = `/blog/author/${post.author}/1.html`;
    authorLink.innerText = post.authorDisplayName;

    var text = article.querySelector('.card-text');
    text.innerText = post.summary || post.description;
    text.style.textOverflow = 'ellipsis';
    text.style.overflow = 'hidden';
    text.style.maxHeight = '200px';
    text.style.display = '-webkit-box';
    text.style.webkitBoxOrient = 'vertical';
    text.style.webkitLineClamp = '3';
    text.style.lineClamp = '3';
    text.style.whiteSpace = 'normal';

    if (post.tags && post.tags.length > 0) {
        var innerBody = article.querySelector('.card-body-content');
        innerBody.appendChild(document.createElement('hr'));
        post.tags.split(',').map(it => it.trim()).filter(it => it.length > 0).forEach(tag => {
            var a = document.createElement('a');
            a.href = `/blog/tag/${tag}/1.html`;
            a.style.backgroundColor = '#f2f2f2';
            a.style.color = '#005da6';
            a.style.fontSize = '14px';
            a.style.textDecoration = 'none';
            a.className = 'p-2 me-1';
            a.innerText = tag;
            innerBody.appendChild(a);
        });
    }

    return article;
}

function renderResults(deduplicatedResults) {
    resultsDiv.innerHTML = `
    <div>
        <div style="background-color:#3F3682;">
            <div class="container">
                <div class="row pb-2 pt-2">
                    <div class="col-sm-12 col-md-10 herocontent" style="background-color:#3F3682;">
                        <h1 style="color:#E7E4FB;" class="herotitle text-md-left"></h1>
                        <p style="color:#E7E4FB;" class="herotext text-md-left"></p>
                    </div>
                </div>
            </div>
        </div>
        <div class="results">
        </div>
    </div>
    `;
    resultsDiv.querySelector('h1').innerText = `Search result${deduplicatedResults.length > 1 ? 's' : ''} for '${query}'`;
    resultsDiv.querySelector('p').innerText = `Showing ${Math.min(deduplicatedResults.length, 100)}/${deduplicatedResults.length}`;
    var nestedResultDiv = resultsDiv.querySelector('div.results');

    if (deduplicatedResults.length == 0) {
        const noResultMessage = document.createElement('div');
        noResultMessage.style.backgroundColor = 'white';
        noResultMessage.style.fontWeight = '600';
        noResultMessage.style.fontSize = '1.2rem';
        noResultMessage.className = 'w-100 pt-4 pb-4 ps-2';
        noResultMessage.innerHTML = '<em>No result found</em>';
        nestedResultDiv.appendChild(noResultMessage);
        return;
    }

    deduplicatedResults.forEach(post => nestedResultDiv.appendChild(renderPost(post)));
}

function deduplicate(results) {
    // now we have a document/index just search
    var ids = new Set();
    // /!\ we must keep the order which is by relevance in general with flexsearch
    return Object.values(results
        .reduce((a, i) => {
            i.result.forEach(r => {
                if (!ids.has(r.id)) {
                    ids.add(r.id);
                    a.push(r.doc);
                }
            });
            return a;
        }, []));
}

fetch('/flexsearch.index.json')
    .then(res => res.json())
    .then(data => {
        var results = createIndex(data || {}).search(query, { enrich: true });
        var deduplicatedResults = deduplicate(results);
        renderResults(deduplicatedResults);
        document.querySelector('head > title').innerText = `Search result${deduplicatedResults.length > 1 ? 's' : ''} for '${query}'`;
    })
    .catch(e => {
        const element = document.createElement('div');
        element.innerText = e.message || 'An error occurred.'; // escape if needed
        resultsDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">An error occurred during the search</h4>
                <p>${element.innerHTML}</p>
                <hr>
            </div>`;
    });
