# Inkwell for Obsidian

[English](./README.md) | **中文**

将 [Inkwell](https://github.com/bellazhuang417-cyber/inkwell) 桌面阅读器忠实移植为 Obsidian 插件。Inkwell 可以原生渲染本地 **.html**、**.md**、**.yaml** 文件——HTML 文件在沙箱 iframe 中**与浏览器完全一致地渲染**，Markdown 和 YAML 则以 styled 预览呈现。

专为拥有大量 AI 生成的 HTML 文件（报告、可视化、卡片笔记）的用户设计——这些文件 Obsidian 打不开、Finder 预览不了，现在可以直接在 vault 里阅读。

---

## 为什么需要这个插件

Obsidian 是一个 Markdown 笔记库，但它**无法原生渲染 `.html` 文件**——只能显示源码。Inkwell 的核心价值正在于此：**原生 HTML 渲染**。本插件将这一能力带入 Obsidian，作为一个自定义阅读视图，保留了独立应用的全部功能。

---

## 功能（移植自 Inkwell）

| Inkwell 桌面版 | Inkwell for Obsidian | 说明 |
|---|---|---|
| 原生 HTML 渲染（沙箱 iframe） | ✅ 相同 | `.html` 文件的 CSS/SVG/图表/JS 完整渲染 |
| Markdown 渲染（自研渲染器） | ✅ 已移植 | GFM 表格、frontmatter、wikilink、标签、中文导出格式 |
| YAML 渲染 | ✅ 已移植 | 美化预览，键值着色 |
| 文件树导航（按需展开） | ✅ | 浏览当前 vault（或指定子目录） |
| `⌘K` / `Ctrl+K` 搜索 | ✅ | Obsidian 命令，默认热键 `Mod+K` |
| `J` / `K` 翻页 | ✅ | 视图内键盘导航 |
| 仅显示 HTML 过滤 | ✅ | 侧边栏一键切换 |
| 反链面板 | ✅ | "引用" tab——扫描 vault 中的引用 |
| 出链面板 | ✅ 新增 | "出链" tab——`[[wikilink]]` 和 `[md](链接)` |
| 标签面板 | ✅ 新增 | "标签" tab——当前文件的 `#标签` |
| 底部栏文档导航 | ✅ | 文件夹、位置、上一篇/下一篇 |
| 自动刷新 | ✅ | 监听 vault 变更，防抖刷新 |
| 沙箱渲染（无样式冲突） | ✅ | iframe 沙箱，可配置权限 |
| 源码编辑 + 回写 | ✅ 新增 | 编辑源码，`⌘S` 或自动保存写回 vault |
| 深色主题 | ✅ | 自动适配 Obsidian 深色模式 |

---

## 安装

### 方式一：手动安装

1. 从 [GitHub 仓库](https://github.com/bellazhuang417-cyber/inkwell-obsidian)下载 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 在你的 vault 中创建目录：`<vault>/.obsidian/plugins/inkwell/`
3. 将三个文件放进去
4. 打开 Obsidian → **设置 → 第三方插件** → 启用 **Inkwell**

### 方式二：BRAT（推荐）

使用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件添加本仓库，即可自动安装并跟踪更新。

---

## 使用

| 操作 | 方式 |
|---|---|
| 打开阅读器 | 点击左侧栏 **Inkwell** 图标，或运行命令 `Inkwell: Open reader` |
| 搜索文件 | `⌘K`（Mac）/ `Ctrl+K`（Win/Linux），或搜索图标 |
| 上一篇 / 下一篇 | `K` / `J`（阅读器获得焦点时） |
| 切换 HTML-only 过滤 | 侧边栏过滤按钮 |
| 在 Inkwell 中打开当前文件 | 命令 `Inkwell: Open current file in Inkwell` |
| 切换渲染 / 源码 | 底部栏 `渲染` / `源码` 按钮 |
| 保存编辑 | `⌘S` / `Ctrl+S`，或自动保存 |
| 浏览引用 / 出链 / 标签 | 右侧面板三个 tab |

### 设置项

- **默认目录**——限定文件树范围（留空 = 整个 vault）
- **启动时打开引用面板**
- **默认仅显示 HTML**
- **HTML 沙箱模式**——`full`（脚本 + same-origin，与桌面版一致，支持图表/交互）、`scripts`（仅脚本）、`none`（完全锁定，仅静态 HTML）
- **自动刷新防抖**
- **侧边栏宽度**
- **编辑时自动保存**
- **自动保存延迟**

> ⚠️ **安全提示：** 沙箱设为 `full` 时，HTML 文件可以运行脚本并拥有 same-origin 权限。这与桌面版行为一致，交互式 HTML（图表、动画）需要此权限。如果你只阅读静态 HTML，可切换到 `none` 以获得最大安全性。

---

## 开发

```bash
cd inkwell-obsidian
npm install
npm run dev      # 监听模式，保存即重建
# 或
npm run build    # 类型检查 + 生产构建
```

需要 Node 18+。构建产出 `main.js`（esbuild, CJS, 外部化 `obsidian`）。

### 项目结构

```
inkwell-obsidian/
├── manifest.json          # Obsidian 插件清单
├── versions.json          # minAppVersion 映射
├── package.json
├── tsconfig.json
├── esbuild.config.mjs     # Obsidian 标准构建配置
├── version-bump.mjs
├── styles.css             # Inkwell 设计变量，.inkwell 命名空间隔离
└── src/
    ├── main.ts            # 插件入口：注册视图、命令、设置
    ├── InkwellView.ts     # 阅读 ItemView（文件树、渲染、导航、引用）
    ├── search.ts          # ⌘K 搜索弹窗
    ├── settings.ts        # 设置接口 + SettingTab
    ├── vault.ts           # vault 访问层（adapter.list / read / 引用扫描）
    ├── markdown.ts        # 移植的 Inkwell Markdown 渲染器
    ├── htmlTemplate.ts    # MD/YAML 预览文档模板
    └── types.ts           # 类型定义
```

---

## 兼容性

- **最低 Obsidian 版本：** `1.1.16`（仅使用稳定 API）
- 已测试 Obsidian 1.5–1.7，应兼容所有 1.1+ 桌面端和移动端
- **移动端：** 支持（DataAdapter 在移动端可用；含脚本的 HTML 可能较慢）
- **深色主题：** 自动适配

---

## 当前局限

- **编辑为源码级**——在"源码"视图编辑原始 `.html`/`.md`/`.yaml` 源码，无所见即所得编辑器。编辑通过 `adapter.write` 写回 vault（默认自动保存 + `⌘S`）
- **HTML 中的相对资源路径**可能无法解析（iframe 使用 `srcdoc`，无 base URL）。使用绝对路径或内联资源可获得完整效果

## 许可证

MIT
