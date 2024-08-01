import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentScript = path.dirname(fileURLToPath(import.meta.url));
const indexLocation = `${currentScript}/../../../_site/flexsearch.index.json`;
const data = JSON.parse(fs.readFileSync(indexLocation));
if (data.exported) {
    console.log(`[INFO] index '${indexLocation}' already pre-computed`);
    process.exit(0);
}

const index = new FlexSearch.Document({
    tokenize: 'forward',
    language: 'en',
    cache: 1000,
    optimize: true,
    encoder: 'extra',
    // preset: 'memory',
    document: {
        id: 'slug',
        index: ['title', 'description', 'body', 'summary'],
        store: ['slug', 'title', 'description', 'publishedOn', 'summary', 'tags', 'gravatar', 'author', 'authorDisplayName', 'postImage']
    },
});

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

var result = { exported: {} };
index.export((key, value) => result.exported[key] = value, undefined, undefined, undefined, undefined, () => {
    fs.writeFileSync(indexLocation, JSON.stringify(result));
    console.log(`[INFO] pre-computed index '${indexLocation}'`);
});
