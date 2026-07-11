// Document templates for Inkwell's sandboxed preview iframe.
// buildMarkdownDoc wraps rendered Markdown HTML in the full Kami-inspired
// stylesheet used by the desktop app (LXGW WenKai serif, ink-blue accent).
// buildYamlDoc renders a pretty-printed YAML preview.

/** Build the full HTML document for a Markdown preview. */
export function buildMarkdownDoc(renderedHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css">
<style>
  :root {
    --parchment: #f5f4ed;
    --ivory: #faf9f5;
    --warm-sand: #e8e6dc;
    --brand: #1B365D;
    --brand-light: #2D5A8A;
    --near-black: #141413;
    --dark-warm: #3d3d3a;
    --olive: #504e49;
    --stone: #6b6a64;
    --border: #e8e6dc;
    --code-bg: #2D2D2D;
    --blockquote-bg: #f0ede7;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "LXGW WenKai", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", Georgia, serif;
    font-size: 15px; font-weight: 400; line-height: 1.75; letter-spacing: 0.35px;
    color: var(--near-black); background: var(--parchment);
    padding: 40px 56px; max-width: 800px; margin: 0 auto;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: "LXGW WenKai", "Source Han Serif SC", Georgia, serif;
    font-weight: 500; color: var(--brand); line-height: 1.25; letter-spacing: 0;
  }
  h1 { font-size: 2em; border-bottom: 2px solid var(--border); padding-bottom: 0.35em; margin-top: 0.6em; margin-bottom: 0.6em; color: var(--near-black); }
  h2 { font-size: 1.55em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; margin-top: 1.6em; margin-bottom: 0.5em; }
  h3 { font-size: 1.25em; margin-top: 1.4em; }
  h4 { font-size: 1.1em; margin-top: 1.2em; }
  h5 { font-size: 1em; color: var(--olive); }
  h6 { font-size: 0.9em; color: var(--stone); }
  p { margin-bottom: 1em; }
  a { color: var(--brand-light); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.18s ease; }
  a:hover { border-bottom-color: var(--brand-light); }
  strong { font-weight: 500; }
  code { font-family: "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace; font-size: 0.85em; background: var(--warm-sand); padding: 1px 6px; border-radius: 4px; color: var(--brand); }
  pre { background: var(--code-bg); color: var(--warm-sand); padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 1.2em 0; font-size: 13px; line-height: 1.6; }
  pre code { background: none; color: inherit; padding: 0; font-size: inherit; border-radius: 0; }
  blockquote { border-left: 3px solid var(--brand); margin: 1.2em 0; padding: 10px 18px; color: var(--olive); background: var(--blockquote-bg); border-radius: 0 6px 6px 0; }
  blockquote p { margin-bottom: 0; }
  hr { border: none; height: 1px; background: var(--border); margin: 2em 0; }
  ul, ol { padding-left: 1.6em; margin-bottom: 1em; }
  li { margin-bottom: 0.35em; }
  img { max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; }
  .wikilink { color: var(--brand); background: rgba(27,54,93,0.07); padding: 1px 5px; border-radius: 3px; cursor: pointer; font-weight: 500; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  body { animation: fadeIn 0.4s ease-out; }
  .frontmatter { background: var(--ivory); border: 1px solid var(--border); border-radius: 8px; padding: 14px 20px; margin-bottom: 1.5em; display: flex; flex-direction: column; gap: 6px; font-size: 0.88em; }
  .fm-item { display: flex; align-items: baseline; gap: 8px; }
  .fm-plain { color: var(--dark-warm); }
  .fm-key { color: var(--stone); font-weight: 500; min-width: 60px; text-align: right; flex-shrink: 0; }
  .fm-val { color: var(--dark-warm); word-break: break-word; }
  .fm-tag { display: inline-block; color: var(--brand-light); background: rgba(45,90,138,0.08); padding: 1px 8px; border-radius: 4px; font-size: 0.92em; margin: 1px 2px; }
  .tag { color: var(--brand-light); background: rgba(45,90,138,0.08); padding: 1px 6px; border-radius: 4px; font-size: 0.9em; white-space: nowrap; }
  h3.section-num { color: var(--near-black); font-size: 1.2em; margin-top: 1.8em; margin-bottom: 0.4em; padding-bottom: 0.15em; border-bottom: 1px solid var(--warm-sand); }
  li.indent-1, li.indent-2, li.indent-3 { list-style-position: outside; }
  ul li.indent-1 { margin-left: 1.2em; }
  ul li.indent-2 { margin-left: 2.4em; color: var(--olive); }
  ul li.indent-3 { margin-left: 3.6em; color: var(--stone); }
  table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 0.92em; line-height: 1.6; }
  th, td { padding: 0.6em 1em; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { font-weight: 600; color: var(--brand); background: rgba(27, 54, 93, 0.05); border-bottom: 2px solid var(--brand); }
  tr:hover td { background: rgba(27, 54, 93, 0.03); }
  tr:last-child td { border-bottom: none; }
</style>
</head>
<body>${renderedHtml}</body>
</html>`;
}

/** Build a pretty-printed YAML preview document. */
export function buildYamlDoc(yamlText: string): string {
  const lines = yamlText.split('\n');
  const body = lines
    .map((line) => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const m = escaped.match(/^(\s*)([^:\s][^:]*?):(.*)$/);
      if (m) {
        const indent = m[1];
        const key = m[2];
        const val = m[3].trim();
        const valHtml = val
          ? `<span class="y-val">${val}</span>`
          : '';
        return `${indent}<span class="y-key">${key}</span>:${valHtml}`;
      }
      // list item or comment
      if (/^\s*#/.test(escaped)) return `<span class="y-comment">${escaped}</span>`;
      if (/^\s*-\s+/.test(escaped)) {
        return escaped.replace(/^(\s*)(-\s+)(.*)$/, '$1<span class="y-dash">$2</span>$3');
      }
      return escaped;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --parchment: #f5f4ed;
    --ivory: #faf9f5;
    --brand: #1B365D;
    --brand-light: #2D5A8A;
    --warm-sand: #e8e6dc;
    --stone: #6b6a64;
    --olive: #504e49;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
    font-size: 13.5px; line-height: 1.7; letter-spacing: 0.2px;
    color: #2b2b2b; background: var(--parchment);
    padding: 40px 56px; max-width: 760px; margin: 0 auto;
    -webkit-font-smoothing: antialiased;
  }
  pre { white-space: pre-wrap; word-break: break-word; }
  .y-key { color: var(--brand); font-weight: 600; }
  .y-val { color: #8a5a2b; }
  .y-comment { color: var(--stone); font-style: italic; }
  .y-dash { color: var(--brand-light); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  body { animation: fadeIn 0.4s ease-out; }
</style>
</head>
<body><pre>${body}</pre></body>
</html>`;
}
