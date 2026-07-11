# Inkwell for Obsidian

[English](./README.md) | **中文**

在 Obsidian 里原生渲染 **.html**、**.md**、**.yaml** 文件——HTML 文件**与浏览器完全一致地渲染**，Markdown 以精美排版呈现，YAML 显示为彩色格式化预览。

---

## 它做什么

Obsidian 擅长 Markdown，但**打不开 `.html` 文件**（只能看源码），也**无法预览 `.yaml`**。Inkwell 填补了这个空白：

### 1. 拓展文件格式支持

| 格式 | Obsidian 原生 | Inkwell |
|---|---|---|
| `.md` | ✅ Markdown 编辑器 | ✅ 精美阅读视图 |
| `.html` / `.htm` | ❌ 仅显示源码 | ✅ **原生浏览器渲染**（CSS、SVG、图表、JS） |
| `.yaml` / `.yml` | ❌ 仅显示源码 | ✅ 美化预览，键值着色 |

HTML 文件在**沙箱 iframe** 中渲染——和浏览器里看到的一模一样。交互组件、图表、动画、自定义 CSS 全部正常工作。

### 2. 优化阅读体验

Markdown 文件通过自研渲染器生成**专注于排版美感的阅读视图**——不是 Obsidian 默认的编辑器。功能包括：

- YAML frontmatter 以整洁的面板呈现，每个字段一行（自动去除引号，YAML 数组渲染为标签 chip）
- GFM 表格、代码块、wikilink、`#标签`
- 中文导出格式支持（编号章节、列表分割）
- 温暖的 Kami 风格美学（serif 正文、墨蓝强调色），支持**深色主题**
- 沙箱渲染——与你现有的 Obsidian 主题零冲突

---

## 功能

- **原生 HTML 渲染** — 沙箱 iframe，完整 CSS/SVG/图表/JS
- **Markdown 精美预览** — 自研渲染器，支持 frontmatter、GFM 表格、wikilink、标签
- **YAML 美化预览** — 键值着色，格式化显示
- **源码编辑** — 内联编辑 `.html`/`.md`/`.yaml` 源码，`⌘S` 或自动保存写回 vault
- **文件树** — 浏览 vault 文件夹，按需展开，HTML-only 过滤
- **`⌘K` 搜索** — 快速文件切换
- **`J` / `K` 翻页** — 键盘切换文件
- **底部栏** — 文件夹上下文、位置指示、上一篇/下一篇
- **自动刷新** — 文件变动时自动更新文件树
- **深色主题** — 自动适配

---

## 安装

### 方式一：直接下载

1. 从 [Releases](https://github.com/bellazhuang417-cyber/inkwell-obsidian/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 创建 `<vault>/.obsidian/plugins/inkwell/` 目录，将三个文件放入
3. Obsidian → **设置 → 第三方插件** → 启用 **Inkwell**

### 方式二：BRAT

使用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件添加本仓库，然后启用 Inkwell。

---

## 使用

| 操作 | 方式 |
|---|---|
| 打开阅读器 | 点击左侧栏**书本图标**，或命令 `Inkwell: Open reader` |
| 搜索文件 | `⌘K`（Mac）/ `Ctrl+K`（Win/Linux） |
| 上一篇 / 下一篇 | `K` / `J` |
| 切换 HTML-only 过滤 | 侧边栏过滤按钮 |
| 在 Inkwell 中打开当前文件 | 命令 `Inkwell: Open current file in Inkwell` |
| 切换渲染 / 源码 | 底部栏按钮 |
| 保存编辑 | `⌘S` / `Ctrl+S`（或自动保存） |

### 设置项

- **默认目录** — 限定文件树范围（留空 = 整个 vault）
- **默认仅显示 HTML**
- **HTML 沙箱模式** — `full`（脚本 + same-origin，支持图表/交互）、`scripts`、或 `none`（仅静态）
- **编辑时自动保存** — 停止输入后自动写回 vault
- **自动刷新防抖** / **侧边栏宽度**

> ⚠️ **安全提示：** 沙箱设为 `full` 时 HTML 文件可运行脚本。交互内容（图表、动画）需要此权限。如仅阅读静态 HTML，可切换到 `none`。

---

## 开发

```bash
npm install
npm run dev      # 监听模式
npm run build    # 类型检查 + 生产构建
```

### 项目结构

```
inkwell-obsidian/
├── manifest.json          # 插件清单
├── styles.css             # 样式（.inkwell 命名空间隔离）
└── src/
    ├── main.ts            # 插件入口：视图、命令、设置
    ├── InkwellView.ts     # 阅读 ItemView（文件树、渲染、导航、编辑）
    ├── search.ts          # ⌘K 搜索弹窗
    ├── settings.ts        # 设置 + SettingTab
    ├── vault.ts           # vault 访问层
    ├── markdown.ts        # 自研 Markdown 渲染器
    ├── htmlTemplate.ts    # MD/YAML 预览文档模板
    └── types.ts           # 类型定义
```

---

## 兼容性

- **最低 Obsidian 版本：** `1.1.16` — 仅使用稳定 API
- 已测试 Obsidian 1.5–1.7，桌面端和移动端
- **深色主题：** 自动适配

## 局限

- **编辑为源码级** — 无所见即所得编辑器
- **HTML 中的相对资源路径**可能无法解析（iframe 使用 `srcdoc`）。使用绝对路径或内联资源

## 许可证

MIT
