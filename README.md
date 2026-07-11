# Inkwell for Obsidian

A faithful port of the [Inkwell](https://github.com/bellazhuang417-cyber/inkwell) desktop reader into an Obsidian plugin. Inkwell renders local **.html**, **.md**, and **.yaml** files natively — HTML files render *exactly as in a browser* inside a sandboxed iframe, while Markdown and YAML render as styled previews.

Built for people with large collections of AI-generated HTML files (reports, visualizations, card notes) that Obsidian can't open and Finder can't preview — now readable directly inside your vault.

---

## Why this exists

Obsidian is a Markdown vault, but it **cannot render `.html` files** natively — they show as raw source. Inkwell's core value is exactly this: **native HTML rendering**. This plugin brings that capability into Obsidian as a custom reader view, preserving every feature of the standalone app.

---

## Features (ported from Inkwell)

| Inkwell desktop | Inkwell for Obsidian | Notes |
|---|---|---|
| Native HTML rendering (sandboxed iframe) | ✅ Same | `.html` renders with full CSS/SVG/charts/JS |
| Markdown rendering (custom renderer) | ✅ Ported | GFM tables, frontmatter, wikilinks, tags, Chinese-export quirks |
| YAML rendering | ✅ Ported | Pretty-printed, color-keyed preview |
| File tree navigation (on-demand expand) | ✅ | Over the current vault (or a scoped subfolder) |
| `⌘K` / `Ctrl+K` search overlay | ✅ | Obsidian command with default hotkey `Mod+K` |
| `J` / `K` move between files | ✅ | In-view keyboard handler |
| HTML-only filter | ✅ | One-click toggle in the sidebar header |
| Backlinks panel | ✅ | "引用" tab — scans the vault for references |
| Outlinks panel | ✅ New | "出链" tab — `[[wikilinks]]` & `[md](links)` |
| Tags panel | ✅ New | "标签" tab — `#tags` in the current file |
| Bottom bar doc navigation (folder, position, prev/next) | ✅ | |
| Auto file refresh | ✅ | Debounced on vault `create/delete/rename/modify` |
| Sandboxed rendering (no style conflicts) | ✅ | iframe with configurable sandbox |
| Kami-inspired aesthetic (warm-white + amber + serif) | ✅ | Scoped under `.inkwell`, with dark-theme support |
| **Source editing + write-back** | ✅ New | Edit `.html`/`.md`/`.yaml` source; `⌘S` or auto-save writes to vault |

---

## Install

### Option A — Manual (for development / testing)

1. Copy this entire `inkwell-obsidian` folder into your vault under:
   ```
   <vault>/.obsidian/plugins/inkwell/
   ```
2. Build it (see [Development](#development)) so that `main.js`, `manifest.json`, and `styles.css` sit in that folder.
3. In Obsidian: **Settings → Community plugins**, enable **Inkwell**.

### Option B — BRAT (recommended for pre-release)

Use the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin to add this repo, then enable Inkwell.

---

## Usage

| Action | How |
|---|---|
| Open the reader | Click the **Inkwell** ribbon icon, or run command `Inkwell: Open reader` |
| Search files | `⌘K` (mac) / `Ctrl+K` (win/linux), or the search icon |
| Previous / next file | `K` / `J` (when the reader is focused, not typing) |
| Toggle HTML-only filter | Filter button in the sidebar header |
| Open the current file in Inkwell | Command `Inkwell: Open current file in Inkwell` (works on `.html`/`.md`/`.yaml`) |
| Switch render ↔ source | Bottom bar `渲染` / `源码` buttons |
| Browse references / outlinks / tags | Right panel tabs |

### Settings

- **Default folder** — scope the tree to a subfolder (empty = whole vault).
- **Open references panel on launch** — show the right panel by default.
- **HTML-only filter by default**.
- **HTML sandbox mode** — `full` (scripts + same-origin, matches the desktop app and enables charts/interactivity), `scripts` (no same-origin), or `none` (fully locked, static HTML only).
- **Auto-refresh debounce**.
- **Sidebar width**.

> ⚠️ **Security note:** sandbox `full` lets HTML files run scripts with same-origin access. This mirrors the desktop app and is required for interactive HTML (charts, animations). If you only read static HTML, switch to `none` for maximum safety.

---

## Development

```bash
cd inkwell-obsidian
npm install
npm run dev      # watch mode → rebuilds main.js on save
# or
npm run build    # type-check + production bundle
```

Requires Node 18+. The build outputs `main.js` (esbuild, CJS, externalizes `obsidian`).

### Project structure

```
inkwell-obsidian/
├── manifest.json          # Obsidian plugin manifest (id, minAppVersion, …)
├── versions.json          # minAppVersion → plugin version map
├── package.json
├── tsconfig.json
├── esbuild.config.mjs     # standard Obsidian build config
├── version-bump.mjs
├── styles.css             # Inkwell design tokens, scoped under .inkwell
├── .gitignore
└── src/
    ├── main.ts            # plugin entry: view, ribbon, commands, settings
    ├── InkwellView.ts     # the reader ItemView (file tree, render, nav, refs)
    ├── search.ts          # ⌘K search modal (Obsidian Modal subclass)
    ├── settings.ts        # settings interface + SettingTab
    ├── vault.ts           # vault access (adapter.list / read / references)
    ├── markdown.ts        # ported Inkwell Markdown renderer
    ├── htmlTemplate.ts    # MD/YAML preview document templates
    └── types.ts           # FileNode / OpenFile / FileType / helpers
```

---

## How Inkwell maps to Obsidian

| Inkwell (desktop) | Obsidian plugin |
|---|---|
| Tauri Rust backend / File System Access API (`fs.ts` abstraction) | `app.vault.adapter` (`list` / `read`) — the vault *is* the folder |
| "Open folder" picker | Settings → **Default folder** (the vault root by default) |
| React `App.tsx` view | Vanilla-TS `ItemView` (`InkwellView`) |
| `localStorage` vault path + `IndexedDB` handle | Not needed — the vault is always available |
| Custom `renderMarkdown()` | Ported verbatim to `markdown.ts` |
| iframe `srcDoc` (sandboxed) | Identical approach, configurable sandbox |
| Lucide icons (React) | Obsidian's bundled Lucide via `setIcon()` |

---

## Compatibility

- **minAppVersion:** `1.1.16` (uses only stable APIs: `registerView`, `ItemView`, `addRibbonIcon`, `addCommand` with hotkeys, `DataAdapter.list/read`, `vault.cachedRead`, `setIcon`, `Modal`, `PluginSettingTab`).
- Tested against Obsidian 1.5–1.7. Should work on any 1.1+ desktop or mobile build.
- **Mobile:** supported (the DataAdapter works on mobile; iframes render fine). Heavy HTML with scripts may be slower on mobile.
- **Dark theme:** automatically adapts (warm-dark palette).

---

## Current limitations

- **Editing is source-only** — you edit the raw `.html`/`.md`/`.yaml` source in the "源码" view; there is no WYSIWYG visual editor. Edits are written back to the vault via `adapter.write` (auto-save by default, plus `⌘S`).
- **Relative asset URLs** in HTML files may not resolve (the iframe uses `srcdoc` with no base URL, same as the desktop app). Use absolute URLs or inline assets for full fidelity.

## License

MIT
