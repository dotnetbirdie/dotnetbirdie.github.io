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

        const opts = { ignoreIllegals: true };
        if (lang > 0 && lang < end && lang > preStart) {
            opts.language = content.substring(lang + langAttr.length, content.indexOf('"', lang + langAttr.length + 1));
        }

        const code = content.substring(nextBlock, end);
        const highlighted = (!opts.language ? hljs.highlightAuto(code) : hljs.highlight(code, opts))
            .value
            .replaceAll(
                /&lt;b class=&quot;conum&quot;&gt;\((\d+)\)&lt;\/b&gt;/g,
                '<b class="conum">($1)</b>')
            .replaceAll(
                /&lt;b <span class="hljs-keyword">class<\/span>=<span class="hljs-string">&quot;conum&quot;<\/span>&gt;\(<span class="hljs-number">(\d+)<\/span>\)&lt;\/b&gt;/g,
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
