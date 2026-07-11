// Inkwell search modal — an Obsidian Modal styled like the desktop app's
// ⌘K overlay. Lists renderable vault files and filters live by name/path.

import { App, Modal, TFile, setIcon } from 'obsidian';
import { extOf } from './types';
import { collectRenderableFiles } from './vault';

export class InkwellSearchModal extends Modal {
  private query = '';
  private results: TFile[] = [];
  private selected = 0;
  private allFiles: TFile[];
  private listEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private readonly onChoose: (file: TFile) => void;
  private readonly scopeFolder?: string;

  constructor(app: App, onChoose: (file: TFile) => void, scope?: string) {
    super(app);
    this.onChoose = onChoose;
    this.scopeFolder = scope;
    this.allFiles = collectRenderableFiles(app.vault, scope);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.modalEl.addClass('inkwell-search-modal');
    this.modalEl.setCssProps({ '--ink-search-width': '560px' });
    this.titleEl.hide();

    const wrapper = contentEl.createDiv({ cls: 'inkwell-search-input-wrapper' });
    const iconBox = wrapper.createDiv({ cls: 'inkwell-search-icon' });
    setIcon(iconBox, 'search');

    this.inputEl = wrapper.createEl('input', {
      cls: 'inkwell-search-input',
      attr: { placeholder: '搜索笔记…', autocomplete: 'off', spellcheck: 'false' },
    });

    const kbd = wrapper.createEl('kbd', { text: 'ESC' });
    kbd.addEventListener('click', () => this.close());

    this.listEl = contentEl.createDiv({ cls: 'inkwell-search-results' });

    this.inputEl.addEventListener('input', () => {
      this.query = this.inputEl.value;
      this.updateResults();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSelected(Math.min(this.selected + 1, this.results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSelected(Math.max(this.selected - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const file = this.results[this.selected];
        if (file) {
          this.onChoose(file);
          this.close();
        }
      }
    });

    this.updateResults();
    setTimeout(() => this.inputEl.focus(), 20);
  }

  private setSelected(i: number): void {
    this.selected = i;
    this.renderList();
    const el = this.listEl.querySelector(`[data-idx="${i}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  private updateResults(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.results = [];
      this.selected = 0;
      this.renderList();
      return;
    }
    this.results = this.allFiles
      .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 30);
    this.selected = 0;
    this.renderList();
  }

  private renderList(): void {
    this.listEl.empty();
    if (this.results.length === 0) {
      if (this.query.trim()) {
        this.listEl.createDiv({ cls: 'inkwell-search-empty', text: '未找到相关笔记' });
      }
      return;
    }
    this.results.forEach((file, i) => {
      const item = this.listEl.createDiv({ cls: 'inkwell-search-item', attr: { 'data-idx': String(i) } });
      if (i === this.selected) item.addClass('selected');

      const iconWrap = item.createDiv({ cls: 'inkwell-search-item-icon' });
      const ext = extOf(file.name);
      iconWrap.addClass(ext === 'html' || ext === 'htm' ? 'html' : ext === 'md' || ext === 'mdx' ? 'md' : 'yaml');
      setIcon(iconWrap, ext === 'html' || ext === 'htm' ? 'file-code' : ext === 'md' || ext === 'mdx' ? 'file-text' : 'braces');

      const info = item.createDiv({ cls: 'inkwell-search-item-info' });
      info.createDiv({ cls: 'inkwell-search-item-name', text: file.name });
      info.createDiv({ cls: 'inkwell-search-item-path', text: file.path });

      item.addEventListener('click', () => {
        this.onChoose(file);
        this.close();
      });
      item.addEventListener('mouseenter', () => this.setSelected(i));
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
