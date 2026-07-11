// InkwellView — the main reader view, faithful port of Inkwell's desktop UI
// into an Obsidian ItemView. Renders local .html/.md/.yaml files natively in a
// sandboxed iframe, with a file tree, doc navigation, references panel, and
// a ⌘K-style search modal.

import { ItemView, WorkspaceLeaf, setIcon, TFile, Notice, debounce } from 'obsidian';
import type InkwellPlugin from './main';
import { FileNode, OpenFile, extOf, classifyFile, RENDERABLE_EXTS } from './types';
import { listDirectory, readFileContent, findReferences, folderOf, flattenTree } from './vault';
import { renderMarkdown, extractTags, extractLinks } from './markdown';
import { buildMarkdownDoc, buildYamlDoc } from './htmlTemplate';
import { InkwellSearchModal } from './search';

export const INKWELL_VIEW_TYPE = 'inkwell-view';

interface RightTabState {
  tab: 'refs' | 'out' | 'tags';
  refs: { name: string; path: string; context: string; ext: string }[];
  out: { target: string; raw: string; context: string }[];
  tags: string[];
  loading: boolean;
}

export class InkwellView extends ItemView {
  plugin: InkwellPlugin;

  // ---- state ----
  private rootNodes: FileNode[] = [];
  private childCache = new Map<string, FileNode[]>();
  private expanded = new Set<string>();
  private currentFile: OpenFile | null = null;
  private mode: 'render' | 'source' = 'render';
  private htmlOnly = false;
  private rightOpen = true;
  private rightTab: 'refs' | 'out' | 'tags' = 'refs';
  private siblings: FileNode[] = [];
  private siblingIndex = -1;
  private sidebarWidth = 240;
  private resizing = false;

  // ---- element refs ----
  private sidebarTreeEl!: HTMLElement;
  private contentBody!: HTMLElement;
  private metaBar!: HTMLElement;
  private renderScroll!: HTMLElement;
  private bottomBar!: HTMLElement;
  private docNavFolder!: HTMLElement;
  private docNavPosition!: HTMLElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private rightPanel!: HTMLElement;
  private rightContent!: HTMLElement;
  private rightTabBtns: Record<string, HTMLButtonElement> = {};
  private filterBtn!: HTMLButtonElement;
  private renderBtn!: HTMLButtonElement;
  private sourceBtn!: HTMLButtonElement;

  // ---- editing state ----
  private dirty = false;
  private sourceArea: HTMLTextAreaElement | null = null;
  private saveBtn!: HTMLButtonElement;
  private badgeEl: HTMLElement | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: InkwellPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return INKWELL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Inkwell';
  }

  getIcon(): string {
    return 'book-open';
  }

  async onOpen(): Promise<void> {
    const s = this.plugin.settings;
    this.htmlOnly = s.htmlOnlyByDefault;
    this.rightOpen = s.rightPanelOpen;
    this.sidebarWidth = s.sidebarWidth;

    this.buildLayout();
    this.bindKeyboard();
    this.bindVaultEvents();

    await this.loadRoot();
  }

  async onClose(): Promise<void> {
    // Flush any unsaved edits before the view is destroyed.
    await this.flushEdit();
  }

  // ================================================================
  // Layout
  // ================================================================

  private buildLayout(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('inkwell');
    contentEl.createDiv({ cls: 'inkwell-root' }, (root) => {
      // ---- top bar ----
      root.createDiv({ cls: 'inkwell-topbar' }, (bar) => {
        bar.createDiv({ cls: 'inkwell-topbar-title' }, (t) => {
          t.createDiv({ cls: 'inkwell-logo-dot' });
          t.createSpan({ text: 'Inkwell' });
        });
        bar.createDiv({ cls: 'inkwell-topbar-actions' }, (actions) => {
          this.iconBtn(actions, 'search', '搜索 (⌘K)', () => this.openSearch());
          this.iconBtn(actions, this.rightOpen ? 'panel-right-close' : 'panel-right-open', '切换右侧面板', (btn) => {
            this.rightOpen = !this.rightOpen;
            this.rightPanel.toggleClass('hidden', !this.rightOpen);
            setIcon(btn, this.rightOpen ? 'panel-right-close' : 'panel-right-open');
          });
        });
      });

      // ---- main ----
      root.createDiv({ cls: 'inkwell-main' }, (main) => {
        // sidebar
        main.createDiv({ cls: 'inkwell-sidebar' }, (side) => {
          side.style.setProperty('width', `${this.sidebarWidth}px`);
          side.createDiv({ cls: 'inkwell-sidebar-header' }, (header) => {
            const scope = this.plugin.settings.defaultFolder || 'Vault';
            header.createSpan({ text: scope.split('/').pop() || scope });
            const btns = header.createDiv({ cls: 'inkwell-sidebar-btns' });
            this.filterBtn = this.iconBtn(btns, 'filter', this.htmlOnly ? '显示全部文件' : '仅显示 HTML', (btn) => {
              this.htmlOnly = !this.htmlOnly;
              btn.toggleClass('active', this.htmlOnly);
              btn.setAttribute('title', this.htmlOnly ? '显示全部文件' : '仅显示 HTML');
              this.renderTree();
            });
            if (this.htmlOnly) this.filterBtn.addClass('active');
            this.iconBtn(btns, 'refresh-cw', '刷新', () => this.refresh());
          });
          this.sidebarTreeEl = side.createDiv({ cls: 'inkwell-sidebar-tree' });
        });

        // resizer
        const resizer = main.createDiv({ cls: 'inkwell-sidebar-resizer' });
        this.registerDomEvent(resizer, 'mousedown', () => this.startResize());

        // content
        main.createDiv({ cls: 'inkwell-content' }, (content) => {
          content.createDiv({ cls: 'inkwell-content-body' }, (body) => {
            this.contentBody = body;
            this.renderEmpty();
          });
          // bottom bar
          this.bottomBar = content.createDiv({ cls: 'inkwell-bottombar hidden' });
          this.buildBottomBar();
        });

        // right panel
        this.rightPanel = main.createDiv({ cls: 'inkwell-right-panel' + (this.rightOpen ? '' : ' hidden') });
        this.buildRightPanel();
      });
    });
  }

  private buildBottomBar(): void {
    this.bottomBar.createDiv({ cls: 'inkwell-bottombar-nav' }, (nav) => {
      const info = nav.createDiv({ cls: 'inkwell-doc-nav-info' });
      this.docNavFolder = info.createDiv({ cls: 'inkwell-doc-nav-folder' });
      setIcon(this.docNavFolder.createSpan(), 'folder');
      this.docNavFolder.createSpan({ cls: 'inkwell-doc-nav-folder-name' });
      this.docNavPosition = info.createDiv({ cls: 'inkwell-doc-nav-position', text: '' });

      const controls = nav.createDiv({ cls: 'inkwell-doc-nav-controls' });
      this.prevBtn = controls.createEl('button', { cls: 'inkwell-doc-nav-btn' });
      setIcon(this.prevBtn.createSpan(), 'arrow-left');
      this.prevBtn.createSpan({ text: '上一篇' });
      this.prevBtn.createEl('kbd', { text: 'K' });
      this.prevBtn.addEventListener('click', () => this.navigateDoc(-1));

      this.nextBtn = controls.createEl('button', { cls: 'inkwell-doc-nav-btn' });
      this.nextBtn.createSpan({ text: '下一篇' });
      setIcon(this.nextBtn.createSpan(), 'arrow-right');
      this.nextBtn.createEl('kbd', { text: 'J' });
      this.nextBtn.addEventListener('click', () => this.navigateDoc(1));
    });

    this.bottomBar.createDiv({ cls: 'inkwell-bottombar-sep' });

    this.bottomBar.createDiv({ cls: 'inkwell-bottombar-views' }, (views) => {
      this.renderBtn = views.createEl('button', { cls: 'inkwell-view-btn active', text: '渲染' });
      this.renderBtn.addEventListener('click', () => this.setMode('render'));
      this.sourceBtn = views.createEl('button', { cls: 'inkwell-view-btn', text: '源码' });
      this.sourceBtn.addEventListener('click', () => this.setMode('source'));
    });
  }

  private buildRightPanel(): void {
    this.rightPanel.createDiv({ cls: 'inkwell-panel-header' }, (header) => {
      header.createSpan({ text: '反链 & 标签' });
      this.iconBtn(header, 'panel-right-close', '关闭面板', (btn) => {
        this.rightOpen = false;
        this.rightPanel.addClass('hidden');
        setIcon(btn, 'panel-right-close');
        // also flip the topbar toggle icon
        const topToggle = this.contentEl.querySelector('.inkwell-topbar-actions button:nth-child(2)') as HTMLElement | null;
        if (topToggle) setIcon(topToggle, 'panel-right-open');
      });
    });
    const tabs = this.rightPanel.createDiv({ cls: 'inkwell-panel-tabs' });
    for (const [key, label] of [['refs', '引用'], ['out', '出链'], ['tags', '标签']] as const) {
      const btn = tabs.createEl('button', { cls: 'inkwell-panel-tab' + (key === this.rightTab ? ' active' : ''), text: label });
      btn.addEventListener('click', () => {
        this.rightTab = key;
        for (const k of Object.keys(this.rightTabBtns)) {
          this.rightTabBtns[k].toggleClass('active', k === key);
        }
        this.renderRightPanel();
      });
      this.rightTabBtns[key] = btn;
    }
    this.rightContent = this.rightPanel.createDiv({ cls: 'inkwell-panel-content' });
    this.renderRightPanelPlaceholder();
  }

  // ================================================================
  // Tree
  // ================================================================

  private async loadRoot(): Promise<void> {
    const scope = this.plugin.settings.defaultFolder;
    try {
      this.rootNodes = await listDirectory(this.app.vault.adapter, scope);
      this.renderTree();
    } catch (e) {
      this.sidebarTreeEl.empty();
      this.sidebarTreeEl.createDiv({ cls: 'inkwell-tree-error', text: `加载失败: ${String(e)}` });
    }
  }

  private renderTree(): void {
    this.sidebarTreeEl.empty();
    if (this.rootNodes.length === 0) {
      this.sidebarTreeEl.createDiv({ cls: 'inkwell-tree-empty', text: '没有可渲染的文件' });
      return;
    }
    this.renderNodes(this.rootNodes, 0, this.sidebarTreeEl);
  }

  private renderNodes(nodes: FileNode[], depth: number, container: HTMLElement): void {
    const visible = this.htmlOnly
      ? nodes.filter((n) => n.isDir || n.ext === 'html' || n.ext === 'htm')
      : nodes;

    for (const node of visible) {
      const indent = depth * 16;
      if (node.isDir) {
        const isExpanded = this.expanded.has(node.path);
        const row = container.createDiv({ cls: 'inkwell-tree-node folder' });
        row.style.setProperty('padding-left', `calc(var(--iw-space-2) + ${indent}px)`);
        const arrow = row.createSpan({ cls: 'inkwell-tree-arrow' + (isExpanded ? ' expanded' : '') });
        setIcon(arrow, 'chevron-right');
        const icon = row.createSpan({ cls: 'inkwell-tree-icon folder' });
        setIcon(icon, isExpanded ? 'folder-open' : 'folder');
        row.createSpan({ cls: 'inkwell-tree-name', text: node.name });
        row.addEventListener('click', () => this.toggleFolder(node));
        if (isExpanded) {
          const children = this.childCache.get(node.path) ?? node.children ?? [];
          if (children.length > 0) {
            this.renderNodes(children, depth + 1, container);
          }
        }
      } else {
        const ext = node.ext || '';
        const isHtml = ext === 'html' || ext === 'htm';
        const isMd = ext === 'md' || ext === 'mdx';
        const isYaml = ext === 'yaml' || ext === 'yml';
        const row = container.createDiv({ cls: 'inkwell-tree-node file' + (this.currentFile?.path === node.path ? ' active' : '') });
        row.style.setProperty('padding-left', `calc(var(--iw-space-2) + ${indent}px + var(--iw-tree-indent))`);
        // spacer for alignment with folder arrows
        row.createSpan({ cls: 'inkwell-tree-arrow-spacer' });
        const icon = row.createSpan({ cls: 'inkwell-tree-icon ' + (isHtml ? 'html' : isMd ? 'md' : isYaml ? 'yaml' : 'other') });
        setIcon(icon, isHtml ? 'file-code' : isMd ? 'file-text' : isYaml ? 'braces' : 'file');
        row.createSpan({ cls: 'inkwell-tree-name', text: node.name });
        row.addEventListener('click', () => this.openFile(node));
      }
    }
  }

  private async toggleFolder(node: FileNode): Promise<void> {
    if (this.expanded.has(node.path)) {
      this.expanded.delete(node.path);
    } else {
      this.expanded.add(node.path);
      if (!this.childCache.has(node.path)) {
        try {
          const children = await listDirectory(this.app.vault.adapter, node.path);
          this.childCache.set(node.path, children);
        } catch {
          this.childCache.set(node.path, []);
        }
      }
    }
    this.renderTree();
  }

  // ================================================================
  // File open / render
  // ================================================================

  async openFile(node: FileNode | TFile): Promise<void> {
    // Flush edits of the previously open file before switching.
    await this.flushEdit();
    const path = node.path;
    const name = node.name;
    const ext = extOf(name);
    try {
      const content = await readFileContent(this.app.vault.adapter, path);
      const fileType = classifyFile(ext);
      const open: OpenFile = {
        path,
        name,
        ext,
        content,
        folder: folderOf(path),
        fileType,
      };
      this.currentFile = open;
      this.mode = 'render';
      this.updateModeButtons();
      this.renderContent();
      this.updateBottomBar();
      await this.computeSiblings(path);
      this.renderTree(); // refresh active highlight
      this.renderRightPanel();
    } catch (e) {
      new Notice(`无法打开 ${name}: ${String(e)}`);
    }
  }

  private renderContent(): void {
    this.contentBody.empty();
    if (!this.currentFile) {
      this.renderEmpty();
      return;
    }
    const file = this.currentFile;

    // meta bar
    this.metaBar = this.contentBody.createDiv({ cls: 'inkwell-render-meta' });
    const info = this.metaBar.createDiv({ cls: 'inkwell-render-meta-info' });
    const iconWrap = info.createDiv({ cls: 'inkwell-render-meta-icon' });
    const ext = file.ext;
    if (ext === 'html' || ext === 'htm') {
      iconWrap.addClass('html');
      setIcon(iconWrap, 'file-code');
    } else if (ext === 'md' || ext === 'mdx') {
      iconWrap.addClass('md');
      setIcon(iconWrap, 'file-text');
    } else if (ext === 'yaml' || ext === 'yml') {
      iconWrap.addClass('yaml');
      setIcon(iconWrap, 'braces');
    } else {
      setIcon(iconWrap, 'file');
    }
    info.createSpan({ cls: 'inkwell-render-filename', text: file.name });
    this.badgeEl = info.createDiv({ cls: 'inkwell-render-badge' });
    this.updateBadge();

    // save action (right side of meta bar)
    const metaActions = this.metaBar.createDiv({ cls: 'inkwell-render-meta-actions' });
    this.saveBtn = this.iconBtn(metaActions, 'save', '保存 (⌘S)', () => this.saveCurrentFile());
    this.saveBtn.disabled = true;

    // body
    this.renderScroll = this.contentBody.createDiv({ cls: 'inkwell-render-scroll' });

    if (this.mode === 'source') {
      const ta = this.renderScroll.createEl('textarea', { cls: 'inkwell-source-area' });
      ta.value = file.content;
      ta.setAttribute('spellcheck', 'false');
      this.sourceArea = ta;
      ta.addEventListener('input', () => this.onSourceInput());
      setTimeout(() => ta.focus(), 30);
      return;
    }

    this.sourceArea = null;

    // render mode -> iframe
    let srcDoc = '';
    if (file.fileType === 'html') {
      srcDoc = file.content;
    } else if (file.fileType === 'md') {
      srcDoc = buildMarkdownDoc(renderMarkdown(file.content));
    } else if (file.fileType === 'yaml') {
      srcDoc = buildYamlDoc(file.content);
    } else {
      // other files: show raw in a pre
      srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:monospace;white-space:pre-wrap;padding:24px;color:#333;background:#fff}</style></head><body>${escapeHtml(file.content)}</body></html>`;
    }

    const iframe = this.renderScroll.createEl('iframe', { cls: 'inkwell-render-iframe' });
    iframe.setAttribute('title', file.name);
    const sandbox = this.sandboxAttr();
    if (sandbox !== null) iframe.setAttribute('sandbox', sandbox);
    iframe.setAttribute('srcdoc', srcDoc);
  }

  private sandboxAttr(): string | null {
    switch (this.plugin.settings.sandboxMode) {
      case 'full':
        return 'allow-scripts allow-same-origin';
      case 'scripts':
        return 'allow-scripts';
      case 'none':
        return '';
      default:
        return 'allow-scripts allow-same-origin';
    }
  }

  private renderEmpty(): void {
    this.contentBody.empty();
    this.contentBody.createDiv({ cls: 'inkwell-empty' }, (empty) => {
      const icon = empty.createDiv({ cls: 'inkwell-empty-icon' });
      setIcon(icon, 'file-code');
      empty.createDiv({ cls: 'inkwell-empty-title', text: '开始你的笔记之旅' });
      empty.createDiv({ cls: 'inkwell-empty-desc' }, (d) => {
        d.appendText('从左侧选择一个 HTML / Markdown / YAML 文件，或按 ');
        const kbd = d.createEl('kbd', { text: '⌘K' });
        d.appendText(' 搜索');
      });
    });
  }

  private async setMode(mode: 'render' | 'source'): Promise<void> {
    if (!this.currentFile) return;
    // Flush edits before switching modes (source → render keeps latest text).
    await this.flushEdit();
    this.mode = mode;
    this.updateModeButtons();
    this.renderContent();
  }

  private updateModeButtons(): void {
    this.renderBtn.toggleClass('active', this.mode === 'render');
    this.sourceBtn.toggleClass('active', this.mode === 'source');
  }

  // ================================================================
  // Editing
  // ================================================================

  private onSourceInput(): void {
    if (!this.sourceArea || !this.currentFile) return;
    this.currentFile.content = this.sourceArea.value;
    this.dirty = true;
    this.updateBadge();
    if (this.saveBtn) this.saveBtn.disabled = false;
    if (this.plugin.settings.autoSave) {
      this.scheduleAutoSave();
    }
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => void this.saveCurrentFile(), this.plugin.settings.autoSaveDelay);
  }

  private updateBadge(): void {
    if (!this.badgeEl) return;
    if (this.mode === 'source') {
      this.badgeEl.setText(this.dirty ? '未保存' : '已保存');
      this.badgeEl.toggleClass('dirty', this.dirty);
      this.badgeEl.toggleClass('saved', !this.dirty);
    } else {
      this.badgeEl.setText(this.currentFile?.fileType === 'html' ? '本地信任' : '渲染预览');
      this.badgeEl.removeClass('dirty');
      this.badgeEl.removeClass('saved');
    }
  }

  async saveCurrentFile(): Promise<void> {
    if (!this.currentFile || !this.dirty) return;
    // capture the latest textarea value
    if (this.sourceArea) this.currentFile.content = this.sourceArea.value;
    try {
      await this.app.vault.adapter.write(this.currentFile.path, this.currentFile.content);
      this.dirty = false;
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
      this.updateBadge();
      if (this.saveBtn) this.saveBtn.disabled = true;
      new Notice(`已保存 ${this.currentFile.name}`, 1500);
      this.renderRightPanel();
    } catch (e) {
      new Notice(`保存失败: ${String(e)}`);
    }
  }

  private async flushEdit(): Promise<void> {
    if (this.mode === 'source' && this.sourceArea && this.currentFile) {
      this.currentFile.content = this.sourceArea.value;
    }
    if (this.dirty) {
      await this.saveCurrentFile();
    }
  }

  // ================================================================
  // Navigation
  // ================================================================

  private async computeSiblings(currentPath: string): Promise<void> {
    const parent = currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/')) : '';
    try {
      const nodes = await listDirectory(this.app.vault.adapter, parent);
      this.siblings = nodes.filter((n) => !n.isDir && RENDERABLE_EXTS.has(n.ext || ''));
      this.siblingIndex = this.siblings.findIndex((f) => f.path === currentPath);
    } catch {
      this.siblings = [];
      this.siblingIndex = -1;
    }
    this.updateBottomBar();
  }

  private navigateDoc(direction: number): void {
    const next = this.siblingIndex + direction;
    if (next < 0 || next >= this.siblings.length) return;
    const node = this.siblings[next];
    void this.openFile(node);
  }

  private updateBottomBar(): void {
    if (!this.currentFile) {
      this.bottomBar.addClass('hidden');
      return;
    }
    this.bottomBar.removeClass('hidden');
    const folderNameEl = this.docNavFolder.querySelector('.inkwell-doc-nav-folder-name');
    if (folderNameEl) folderNameEl.setText(this.currentFile.folder || '(root)');
    this.docNavPosition.setText(
      this.siblingIndex >= 0 ? `${this.siblingIndex + 1} / ${this.siblings.length}` : '',
    );
    this.prevBtn.disabled = this.siblingIndex <= 0;
    this.nextBtn.disabled = this.siblingIndex >= this.siblings.length - 1;
  }

  // ================================================================
  // Right panel
  // ================================================================

  private renderRightPanelPlaceholder(): void {
    this.rightContent.empty();
    if (!this.currentFile) {
      this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '打开文件后查看引用关系' });
    } else {
      this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '加载中…' });
    }
  }

  private async renderRightPanel(): Promise<void> {
    if (!this.currentFile) {
      this.renderRightPanelPlaceholder();
      return;
    }
    this.rightContent.empty();

    if (this.rightTab === 'tags') {
      const tags = extractTags(this.currentFile.content);
      if (tags.length === 0) {
        this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '当前文件没有标签' });
        return;
      }
      const wrap = this.rightContent.createDiv({ cls: 'inkwell-tag-cloud' });
      for (const tag of tags) {
        wrap.createEl('span', { cls: 'inkwell-tag-chip', text: `#${tag}` });
      }
      return;
    }

    if (this.rightTab === 'out') {
      const links = extractLinks(this.currentFile.content);
      if (links.length === 0) {
        this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '当前文件没有出链' });
        return;
      }
      for (const link of links) {
        const card = this.rightContent.createDiv({ cls: 'inkwell-backlink-card' });
        card.createDiv({ cls: 'inkwell-backlink-name', text: link.target });
        card.createDiv({ cls: 'inkwell-backlink-context', text: link.context });
        card.addEventListener('click', () => this.openByName(link.target));
      }
      return;
    }

    // refs (backlinks)
    this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '搜索引用中…' });
    try {
      const refs = await findReferences(
        this.app,
        { name: this.currentFile.name, path: this.currentFile.path },
        this.plugin.settings.defaultFolder || undefined,
      );
      this.rightContent.empty();
      if (refs.length === 0) {
        this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '没有其他文件引用此文件' });
        return;
      }
      for (const ref of refs) {
        const card = this.rightContent.createDiv({ cls: 'inkwell-backlink-card' });
        card.createDiv({ cls: 'inkwell-backlink-name', text: ref.name });
        card.createDiv({ cls: 'inkwell-backlink-context', text: ref.context });
        card.createDiv({ cls: 'inkwell-backlink-path', text: ref.path });
        card.addEventListener('click', () => this.openByPath(ref.path));
      }
    } catch {
      this.rightContent.empty();
      this.rightContent.createDiv({ cls: 'inkwell-panel-hint', text: '引用搜索失败' });
    }
  }

  private async openByName(name: string): Promise<void> {
    const cleaned = name.replace(/\.[^.]+$/, '');
    const file = this.app.vault.getFiles().find((f) => {
      const base = f.name.replace(/\.[^.]+$/, '');
      return base === cleaned || f.name === name;
    });
    if (file) {
      await this.openFile(file);
    } else {
      new Notice(`未找到文件: ${name}`);
    }
  }

  private async openByPath(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.openFile(file);
    } else {
      new Notice(`未找到文件: ${path}`);
    }
  }

  // ================================================================
  // Search / refresh / resize
  // ================================================================

  openSearch(): void {
    new InkwellSearchModal(
      this.app,
      (file) => void this.openFile(file),
      this.plugin.settings.defaultFolder || undefined,
    ).open();
  }

  private async refresh(): Promise<void> {
    this.childCache.clear();
    this.expanded.clear();
    await this.loadRoot();
    if (this.currentFile) {
      // re-read current file content in case it changed
      try {
        const content = await readFileContent(this.app.vault.adapter, this.currentFile.path);
        this.currentFile.content = content;
        this.renderContent();
        this.renderRightPanel();
      } catch {
        // file may have been deleted
      }
    }
  }

  private bindVaultEvents(): void {
    const debounced = debounce(() => void this.refresh(), this.plugin.settings.refreshDebounce, true);
    this.registerEvent(this.app.vault.on('create', debounced));
    this.registerEvent(this.app.vault.on('delete', debounced));
    this.registerEvent(this.app.vault.on('rename', debounced));
    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (this.currentFile && file.path === this.currentFile.path) {
        void this.refresh();
      } else {
        debounced();
      }
    }));
  }

  private bindKeyboard(): void {
    this.registerDomEvent(this.contentEl, 'keydown', (e: KeyboardEvent) => {
      // ⌘S / Ctrl+S — save (must work while typing in the source area)
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void this.saveCurrentFile();
        return;
      }
      const target = e.target as HTMLElement;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        this.navigateDoc(1);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        this.navigateDoc(-1);
      }
    });
  }

  private startResize(): void {
    this.resizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e: MouseEvent) => {
      if (!this.resizing) return;
      const rect = this.contentEl.getBoundingClientRect();
      const newWidth = Math.max(160, Math.min(480, e.clientX - rect.left));
      this.sidebarWidth = newWidth;
      const side = this.contentEl.querySelector('.inkwell-sidebar') as HTMLElement | null;
      if (side) side.style.setProperty('width', `${newWidth}px`);
    };
    const onUp = () => {
      this.resizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.plugin.settings.sidebarWidth = this.sidebarWidth;
      void this.plugin.saveSettings();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ================================================================
  // Helpers
  // ================================================================

  private iconBtn(
    parent: HTMLElement,
    icon: string,
    title: string,
    onClick: (btn: HTMLButtonElement) => void,
  ): HTMLButtonElement {
    const btn = parent.createEl('button', { cls: 'inkwell-view-btn', attr: { title } });
    setIcon(btn, icon);
    btn.addEventListener('click', () => onClick(btn));
    return btn;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
