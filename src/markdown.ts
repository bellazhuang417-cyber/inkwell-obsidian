// Faithful port of Inkwell's custom Markdown renderer (htmlnote/src/App.tsx).
// Renders GFM tables, YAML frontmatter, wikilinks, tags, Chinese-export quirks,
// numbered section headers, and bullet/list handling — preserving the exact
// behavior of the desktop app. Returns an HTML string used to build the
// sandboxed preview document.

/** Render a Markdown string into an HTML string (Inkwell dialect). */
export function renderMarkdown(md: string): string {
  let html = md;

  // === 1. YAML Frontmatter: detect and render as meta panel ===
  const MAX_FM_VAL_LEN = 80;
  html = html.replace(/^---\n([\s\S]*?)\n---\n*/g, (_m: string, fm: string) => {
    const lines = fm.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return '';
    const items = lines
      .map((line: string) => {
        const idx = line.indexOf(':');
        if (idx === -1) return `<span class="fm-item fm-plain">${esc(line)}</span>`;
        const key = line.substring(0, idx).trim();
        let val = line.substring(idx + 1).trim();
        if (val.length > MAX_FM_VAL_LEN) {
          val = val.substring(0, MAX_FM_VAL_LEN) + '\u2026';
        }
        return `<span class="fm-item"><span class="fm-key">${esc(key)}</span><span class="fm-val">${esc(val)}</span></span>`;
      })
      .join('');
    return `<div class="frontmatter">${items}</div>`;
  });

  // === 2. Fenced code blocks — protect inner content ===
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code class="lang-${lang}">${escaped}</code></pre>`;
  });

  // === 3. Split long paragraphs at semantic boundaries (Chinese export) ===
  html = html.replace(/([^\n])(\s*\d+\.\s+[\u4e00-\u9fa5A-Z])/g, '$1\n$2');
  html = textSplitBeforeBullets(html);

  // === 4. Inline code (backtick) ===
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // === 5. Headers (ATX style) — per-line to avoid cross-line corruption ===
  const lines3 = html.split('\n');
  html = lines3
    .map((line) => {
      if (/^###### /.test(line)) return line.replace(/^###### (.*)$/, '<h6>$1</h6>');
      if (/^##### /.test(line)) return line.replace(/^##### (.*)$/, '<h5>$1</h5>');
      if (/^#### /.test(line)) return line.replace(/^#### (.*)$/, '<h4>$1</h4>');
      if (/^### /.test(line)) return line.replace(/^### (.*)$/, '<h3>$1</h3>');
      if (/^## /.test(line)) return line.replace(/^## (.*)$/, '<h2>$1</h2>');
      if (/^# /.test(line)) return line.replace(/^# (.*)$/, '<h1>$1</h1>');
      return line;
    })
    .join('\n');

  // === 6. Numbered section headers ("1. 投资认知" pattern) ===
  const lines4 = html.split('\n');
  html = lines4
    .map((line) => {
      const m = line.match(/^(\d+)\.\s+([\u4e00-\u9fa5][^\n]*)$/);
      if (m && !line.match(/^[<]/)) {
        return `<h3 class="section-num">${m[1]}. ${m[2]}</h3>`;
      }
      return line;
    })
    .join('\n');

  // === 7. Horizontal rule ===
  const lines5 = html.split('\n');
  html = lines5
    .map((line) => {
      if (/^(---|\*\*\*|___)$/.test(line.trim()) && !line.startsWith('<')) return '<hr/>';
      return line;
    })
    .join('\n');

  // === 8. Images (before links since ![...](...) contains [...](...)) ===
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // === 9. Links ===
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // === 10. Bold & Italic ===
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(?!\*)(.*?)(?<!\*)\*/g, '<em>$1</em>');

  // === 11. Blockquotes ===
  const lines6 = html.split('\n');
  html = lines6
    .map((line) => {
      if (/^>\s+/.test(line) && !line.startsWith('<')) {
        return line.replace(/^>\s+(.*)$/, '<blockquote>$1</blockquote>');
      }
      return line;
    })
    .join('\n');

  // === 12. Wikilinks (Obsidian-style) ===
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">[[$1]]</span>');

  // === 13. Tags (#tag in running text) ===
  html = html.replace(/(^|\s)#([\u4e00-\u9fa5A-Za-z0-9_\/]+)/g, '$1<span class="tag">#$2</span>');

  // === 14. List Items: multi-style bullets + indent-level detection ===
  const lines7 = html.split('\n');
  html = lines7
    .map((line) => {
      if (line.startsWith('<') || line.trim() === '') return line;
      const ulM = line.match(/^(\s*)([-*\u2022\u25e6\u25cb\u00b7])\s+(.*)$/);
      if (ulM) {
        const level = Math.floor(ulM[1].length / 2);
        const cls = level > 0 ? ` class="indent-${Math.min(level, 3)}"` : '';
        return `<li${cls}>${ulM[3]}</li>`;
      }
      const olM = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olM && /^[\u4e00-\u9fa5]/.test(olM[3])) return line; // skip CJK headers
      if (olM) {
        const level = Math.floor(olM[1].length / 2);
        const cls = level > 0 ? ` class="indent-${Math.min(level, 3)}"` : '';
        return `<li class="ordered"${cls}>${olM[2]}. ${olM[3]}</li>`;
      }
      return line;
    })
    .join('\n');

  // === 15. GFM Tables (pipe syntax) ===
  html = renderGFMTables(html);

  // === 16. Wrap consecutive <li> into <ul>/<ol> with nesting ===
  html = wrapListItems(html);

  // === 17. Smart paragraph wrapping ===
  html = wrapParagraphs(html);

  return html;
}

/** Render GFM (GitHub Flavored Markdown) pipe tables into <table> HTML. */
function renderGFMTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let tableLines: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine;
    const isTableRow = /^\|(.+)\|$/.test(line.trim());
    const isSeparator = /^\|[\s\-:|\s]+\|$/.test(line.trim());

    if (isTableRow || isSeparator) {
      if (tableLines === null) {
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (tableLines !== null) {
        result.push(buildGFMTable(tableLines));
        tableLines = null;
      }
      result.push(line);
    }
  }

  if (tableLines !== null) {
    result.push(buildGFMTable(tableLines));
  }

  return result.join('\n');
}

/** Convert an array of GFM table lines into a <table> element. */
function buildGFMTable(lines: string[]): string {
  const rows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[\s\-:|]+$/.test(trimmed.replace(/^\|/, '').replace(/\|$/, ''))) continue;
    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  const numCols = Math.max(...rows.map((r) => r.length));
  let html = '<table>\n';
  for (let i = 0; i < rows.length; i++) {
    const tag = i === 0 ? 'th' : 'td';
    html += '  <tr>';
    for (let j = 0; j < numCols; j++) {
      const cell = rows[i][j] || '';
      html += `<${tag}>${cell}</${tag}>`;
    }
    html += '</tr>\n';
  }
  html += '</table>';
  return html;
}

/** Split text before bullet markers that appear mid-line (Chinese export format). */
function textSplitBeforeBullets(text: string): string {
  return text
    .replace(/([^\n\s])(\s*)([\u2022\u25e6\u25cb\u00b7])/g, (_m, before: string, space: string, bullet: string) => `${before}\n${space}${bullet}`)
    .replace(/\n{2,}/g, '\n');
}

/** Wrap consecutive <li> elements into proper <ul>/<ol> containers. */
function wrapListItems(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let listBuf: string[] | null = null;
  let isOrderedBuf = false;

  for (const rawLine of lines) {
    const line = rawLine;
    const isLi = /^<li[\s>]/.test(line);
    const isOrdered = /class="ordered"/.test(line);

    if (isLi) {
      if (listBuf === null) {
        listBuf = [];
        isOrderedBuf = isOrdered;
        result.push(isOrdered ? '<ol>' : '<ul>');
      } else if (isOrdered !== isOrderedBuf) {
        result.push(isOrderedBuf ? '</ol>' : '</ul>');
        listBuf = [];
        isOrderedBuf = isOrdered;
        result.push(isOrdered ? '<ol>' : '<ul>');
      }
      listBuf.push(line);
      result.push(line);
    } else {
      if (listBuf !== null) {
        result.push(isOrderedBuf ? '</ol>' : '</ul>');
        listBuf = null;
      }
      result.push(line);
    }
  }
  if (listBuf !== null) {
    result.push(isOrderedBuf ? '</ol>' : '</ul>');
  }

  return result.join('\n');
}

/** Wrap plain-text lines as paragraphs, preserving existing block tags. */
function wrapParagraphs(text: string): string {
  const blocks = text.split(/\n\n+/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|hr|pre|ul|ol|blockquote|div|img|table)[\s>]/.test(trimmed)) return block;
      const lines = block.split('\n').filter((l) => l.trim());
      return '\n' + lines.map((l) => {
        if (l.startsWith('<')) return l;
        if (!l.trim()) return '';
        return `<p>${l}</p>`;
      }).join('\n') + '\n';
    })
    .join('\n\n');
}

/** Minimal HTML escaping for frontmatter key/value rendering. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Extract #tags from running markdown text (used by the tags panel). */
export function extractTags(md: string): string[] {
  const tags = new Set<string>();
  const re = /(^|\s)#([\u4e00-\u9fa5A-Za-z0-9_\/]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    tags.add(m[2]);
  }
  return Array.from(tags);
}

/** Extract [[wikilinks]] / [text](target) targets from markdown (outlinks panel). */
export function extractLinks(md: string): { target: string; raw: string; context: string }[] {
  const out: { target: string; raw: string; context: string }[] = [];
  const wiki = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = wiki.exec(md))) {
    const target = m[1].split('|')[0].trim();
    out.push({ target, raw: m[0], context: snippet(md, m.index) });
  }
  const mdlink = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((m = mdlink.exec(md))) {
    out.push({ target: m[2].trim(), raw: m[0], context: snippet(md, m.index) });
  }
  return out;
}

function snippet(text: string, index: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + 60);
  return text.substring(start, end).replace(/\n/g, ' ').trim();
}
