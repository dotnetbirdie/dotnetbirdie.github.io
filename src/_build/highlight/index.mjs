import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import hljs from 'highlight.js';

const currentScript = path.dirname(fileURLToPath(import.meta.url));
const sources = `${currentScript}/../../../_site`;

function preHighlight(file) {
    let content = fs.readFileSync(file, { encoding: 'utf-8' });

    {
        const autoHighlighting = content.indexOf('<script>hljs.highlightAll();</script>');
        if (autoHighlighting < 0) {
            return;
        }

        const highlightJs = content.lastIndexOf('<script ', autoHighlighting - 1);
        if (highlightJs < 0) {
            return;
        }

        content = `${content.substring(0, highlightJs).trim()}\n${content.substring(content.indexOf('\n', autoHighlighting)).trim()}`;
    }

    const prefix = '<pre class="highlightjs highlight"><code';
    const suffix = '</code></pre>';
    const langAttr = 'data-lang="';
    let from = 0;
    while (true) {
        const preStart = content.indexOf(prefix, from);
        let nextBlock = preStart;
        if (nextBlock < 0) {
            break;
        }
        nextBlock += prefix.length;
        nextBlock = content.indexOf('>', nextBlock + 1); // go to the end of <code ...> block
        if (nextBlock < 0) {
            throw new Error(`Invalid block, missing <code...>: ${file}`);
        }
        nextBlock++;

        const end = content.indexOf(suffix, nextBlock);
        if (end < 0) {
            throw new Error(`Invalid block: ${file}`);
        }
        const lang = content.lastIndexOf(langAttr, nextBlock);
        if (lang === 'nohighlight') {
            from = end + 1;
        }

        const opts = { ignoreIllegals: true };
        if (lang > 0 && lang < end && lang > preStart) {
            opts.language = content.substring(lang + langAttr.length, content.indexOf('"', lang + langAttr.length + 1));
        }

        const code = content.substring(nextBlock, end);
        const rawHighlighted = (!opts.language ? hljs.highlightAuto(code) : hljs.highlight(code, opts))
            .value
            // revert escapeHtml since we are in a pre block - needed cause outside the dom in terms of highlight.js API, dom wired API knows it
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, '\'');
        const highlighted = rawHighlighted
            // conum were escaped - see next replaces - so just get them back
            .replace(
                /<b class=<span class="hljs-string">"conum"<\/span>>\((\d+)\)<\/b>/g,
                '<b class="conum">($1)</b>')
            .replace(
                /<b <span class="hljs-keyword">class<\/span>=<span class="hljs-string">"conum"<\/span>>\(<span class="hljs-number">(\d+)<\/span>\)<\/b>/g,
                '<b class="conum">($1)</b>');
        content = `${content.substring(0, nextBlock)}${highlighted}${content.substring(end)}`;
        from = nextBlock + highlighted.length + suffix.length + 1;
    }

    fs.writeFileSync(file, content);
}

function visit(dir, ...excluded) {
    for (const file of fs.readdirSync(dir)) {
        if (excluded.some(it => it == file)) {
            continue;
        }

        const absolutePath = path.join(dir, file);
        const stats = fs.statSync(absolutePath);
        if (stats.isDirectory()) {
            visit(absolutePath);
            continue;
        }
        if (stats.isFile() && absolutePath.endsWith('.html')) {
            preHighlight(absolutePath);
        }
    }
}

hljs.configure({
    // we'd like but this is not supported in not browser mode
    ignoreUnescapedHTML: true,
});

visit(sources, 'blog', 'index.html', 'search.html');
