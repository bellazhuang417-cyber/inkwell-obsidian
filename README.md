# Inkwell for Obsidian

**English** | [中文](./README.zh-CN.md)

Render **.html**, **.md**, and **.yaml** files beautifully inside Obsidian — HTML files render *exactly as in a browser*, Markdown gets a polished styled preview, and YAML shows a color-keyed formatted view.

---

## What it does

Obsidian is great at Markdown, but it **can't open `.html` files** (they show as raw source) and **can't preview `.yaml`** either. Inkwell fills that gap:

### 1. Extended file format support

| Format | Obsidian native | Inkwell |
|---|---|---|
| `.md` | ✅ Markdown editor | ✅ Styled reader view |
| `.html` / `.htm` | ❌ Raw source only | ✅ **Native browser rendering** (CSS, SVG, charts, JS) |
| `.yaml` / `.yml` | ❌ Raw source only | ✅ Pretty-printed, color-keyed preview |

HTML files render inside a **sandboxed iframe** — exactly as they would in a browser. Interactive components, charts, animations, and custom CSS all work.

### 2. Enhanced reading experience

Markdown files are rendered with a custom renderer that produces a **beautiful, typography-focused reading view** — not the default Obsidian editor. Features include:

- YAML frontmatter displayed as a clean, one-field-per-line meta panel (with quote stripping and YAML array tag chips)
- GFM tables, fenced code blocks, wikilinks, and `#tags`
- Chinese-export formatting support (numbered sections, bullet splitting)
- Warm Kami-inspired aesthetic (serif body, ink-blue accents) with **dark theme support**
- Sandboxed rendering — no style conflicts with your Obsidian theme

---

## Features

- **Native HTML rendering** — sandboxed iframe, full CSS/SVG/charts/JS
- **Markdown styled preview** — custom renderer with frontmatter, GFM tables, wikilinks, tags
- **YAML pretty-print** — color-keyed, formatted preview
- **Source editing** — edit `.html`/`.md`/`.yaml` source inline; `⌘S` or auto-save writes back to vault
- **File tree** — browse vault folders, expand on demand, HTML-only filter
- **`⌘K` search** — quick file switcher
- **`J` / `K` navigation** — move between files with keyboard
- **Bottom bar** — folder context, position indicator, prev/next buttons
- **Auto-refresh** — tree updates when files change on disk
- **Dark theme** — automatically adapts

---

## Install

### Option A — Direct download

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/bellazhuang417-cyber/inkwell-obsidian/releases)
2. Create `<vault>/.obsidian/plugins/inkwell/` and copy the three files in
3. Obsidian → **Settings → Community plugins** → enable **Inkwell**

### Option B — BRAT

Use [BRAT](https://github.com/TfTHacker/obsidian42-brat) to add this repo, then enable Inkwell.

---

## Usage

| Action | How |
|---|---|
| Open the reader | Click the **book icon** in the left ribbon, or command `Inkwell: Open reader` |
| Search files | `⌘K` (mac) / `Ctrl+K` (win/linux) |
| Previous / next file | `K` / `J` |
| Toggle HTML-only filter | Filter button in sidebar header |
| Open current file in Inkwell | Command `Inkwell: Open current file in Inkwell` |
| Switch render ↔ source | Bottom bar buttons |
| Save edits | `⌘S` / `Ctrl+S` (or auto-save) |

### Settings

- **Default folder** — scope the file tree (empty = whole vault)
- **HTML-only filter by default**
- **HTML sandbox mode** — `full` (scripts + same-origin, enables charts/interactivity), `scripts`, or `none` (static only)
- **Auto-save while editing** — write edits back to vault after you stop typing
- **Auto-refresh debounce** / **Sidebar width**

> ⚠️ **Security:** sandbox `full` lets HTML files run scripts. This is required for interactive content (charts, animations). For static HTML only, switch to `none`.

---

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # type-check + production bundle
```

### Project structure

```
inkwell-obsidian/
├── manifest.json          # plugin manifest
├── styles.css             # scoped under .inkwell
└── src/
    ├── main.ts            # plugin entry: view, ribbon, commands, settings
    ├── InkwellView.ts     # reader ItemView (file tree, render, nav, editing)
    ├── search.ts          # ⌘K search modal
    ├── settings.ts        # settings + SettingTab
    ├── vault.ts           # vault access (adapter.list / read)
    ├── markdown.ts        # custom Markdown renderer
    ├── htmlTemplate.ts    # MD/YAML preview document templates
    └── types.ts           # type definitions
```

---

## Compatibility

- **minAppVersion:** `1.1.16` — uses only stable Obsidian APIs
- Tested on Obsidian 1.5–1.7, desktop and mobile
- **Dark theme:** automatically adapts

## Limitations

- **Editing is source-only** — no WYSIWYG visual editor
- **Relative asset URLs** in HTML may not resolve (iframe uses `srcdoc`). Use absolute URLs or inline assets

## License

MIT
