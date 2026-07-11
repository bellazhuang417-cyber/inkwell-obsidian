// Inkwell — an Obsidian plugin that ports the Inkwell desktop reader into the
// vault. Adds a custom view that renders local .html/.md/.yaml files natively
// in a sandboxed iframe, with a file tree, doc navigation, and a references
// panel.

import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { InkwellView, INKWELL_VIEW_TYPE } from './InkwellView';
import { InkwellSettingTab, InkwellSettings, DEFAULT_SETTINGS } from './settings';
import { extOf, classifyFile, RENDERABLE_EXTS } from './types';

export default class InkwellPlugin extends Plugin {
  settings!: InkwellSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register the view.
    this.registerView(INKWELL_VIEW_TYPE, (leaf) => new InkwellView(leaf, this));

    // Ribbon icon to open the reader.
    this.addRibbonIcon('book-open', 'Open Inkwell', () => {
      void this.activateView();
    });

    // Status bar hint.
    this.addStatusBarItem().setText('Inkwell ready');

    // Commands.
    this.addCommand({
      id: 'open-inkwell',
      name: 'Open Inkwell reader',
      callback: () => void this.activateView(),
    });

    this.addCommand({
      id: 'inkwell-search',
      name: 'Search files in Inkwell',
      hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
      callback: () => {
        const view = this.getActiveView();
        if (view) {
          view.openSearch();
        } else {
          void this.activateView().then(() => {
            setTimeout(() => this.getActiveView()?.openSearch(), 120);
          });
        }
      },
    });

    this.addCommand({
      id: 'open-current-in-inkwell',
      name: 'Open current file in Inkwell',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!RENDERABLE_EXTS.has(extOf(file.name))) return false;
        if (checking) return true;
        void this.activateView().then(() => {
          const view = this.getActiveView();
          if (view) void view.openFile(file);
        });
        return true;
      },
    });

    this.addCommand({
      id: 'save-current-in-inkwell',
      name: 'Save current file (Inkwell)',
      hotkeys: [{ modifiers: ['Mod'], key: 's' }],
      checkCallback: (checking: boolean) => {
        const view = this.getActiveView();
        if (!view) return false;
        if (checking) return true;
        void view.saveCurrentFile();
        return true;
      },
    });

    // Settings tab.
    this.addSettingTab(new InkwellSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    // Obsidian detaches views automatically; nothing extra to clean up.
  }

  async activateView(file?: TFile): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(INKWELL_VIEW_TYPE);
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: INKWELL_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
    if (file) {
      const view = leaf.view;
      if (view instanceof InkwellView) {
        await view.openFile(file);
      }
    }
  }

  private getActiveView(): InkwellView | null {
    const leaves = this.app.workspace.getLeavesOfType(INKWELL_VIEW_TYPE);
    if (leaves.length === 0) return null;
    const view = leaves[0].view;
    return view instanceof InkwellView ? view : null;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// Re-export so the bundled module surface includes the classification helpers
// (handy for other plugins / the console).
export { extOf, classifyFile };
