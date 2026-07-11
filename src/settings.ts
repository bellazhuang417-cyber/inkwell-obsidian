// Settings for the Inkwell Obsidian plugin.

import { App, PluginSettingTab, Setting } from 'obsidian';
import type InkwellPlugin from './main';

export interface InkwellSettings {
  /** Default subfolder to scope the file tree (empty = whole vault). */
  defaultFolder: string;
  /** Start with the right references panel open. */
  rightPanelOpen: boolean;
  /** Default to showing only HTML files in the tree. */
  htmlOnlyByDefault: boolean;
  /** Sandbox mode for the HTML iframe: full (scripts+same-origin), scripts, or none. */
  sandboxMode: 'full' | 'scripts' | 'none';
  /** Debounce interval (ms) for auto-refresh on vault changes. */
  refreshDebounce: number;
  /** Sidebar width in px. */
  sidebarWidth: number;
  /** Auto-save while editing source (debounced). */
  autoSave: boolean;
  /** Auto-save delay (ms) after the last keystroke. */
  autoSaveDelay: number;
}

export const DEFAULT_SETTINGS: InkwellSettings = {
  defaultFolder: '',
  rightPanelOpen: true,
  htmlOnlyByDefault: false,
  sandboxMode: 'full',
  refreshDebounce: 1000,
  sidebarWidth: 240,
  autoSave: true,
  autoSaveDelay: 800,
};

export class InkwellSettingTab extends PluginSettingTab {
  plugin: InkwellPlugin;

  constructor(app: App, plugin: InkwellPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h3', { text: 'Inkwell' });
    containerEl.createEl('p', {
      cls: 'setting-item-description',
      text: 'A native HTML / Markdown / YAML reader inside Obsidian.',
    });

    new Setting(containerEl)
      .setName('Default folder')
      .setDesc('Vault-relative folder to scope the file tree on open (empty = whole vault).')
      .addText((text) =>
        text
          .setPlaceholder('e.g. Notes')
          .setValue(this.plugin.settings.defaultFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Open references panel on launch')
      .setDesc('Show the backlinks / outlinks / tags panel by default.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rightPanelOpen)
          .onChange(async (value) => {
            this.plugin.settings.rightPanelOpen = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('HTML-only filter by default')
      .setDesc('Hide non-HTML files in the tree when the view opens.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.htmlOnlyByDefault)
          .onChange(async (value) => {
            this.plugin.settings.htmlOnlyByDefault = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('HTML sandbox mode')
      .setDesc(
        '"full" = scripts + same-origin (matches desktop app, enables charts/interactivity). "scripts" = no same-origin. "none" = fully locked (static HTML only).',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption('full', 'Full (scripts + same-origin)')
          .addOption('scripts', 'Scripts only')
          .addOption('none', 'None (static)')
          .setValue(this.plugin.settings.sandboxMode)
          .onChange(async (value) => {
            this.plugin.settings.sandboxMode = value as InkwellSettings['sandboxMode'];
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Auto-refresh debounce (ms)')
      .setDesc('How long to wait after a vault change before refreshing the tree.')
      .addText((text) =>
        text
          .setPlaceholder('1000')
          .setValue(String(this.plugin.settings.refreshDebounce))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 100) {
              this.plugin.settings.refreshDebounce = n;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName('Sidebar width (px)')
      .setDesc('Default width of the file tree sidebar.')
      .addText((text) =>
        text
          .setPlaceholder('240')
          .setValue(String(this.plugin.settings.sidebarWidth))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 160 && n <= 480) {
              this.plugin.settings.sidebarWidth = n;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName('Auto-save while editing')
      .setDesc('Automatically write edits back to the vault after you stop typing.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSave)
          .onChange(async (value) => {
            this.plugin.settings.autoSave = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Auto-save delay (ms)')
      .setDesc('How long to wait after the last keystroke before saving.')
      .addText((text) =>
        text
          .setPlaceholder('800')
          .setValue(String(this.plugin.settings.autoSaveDelay))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 200 && n <= 5000) {
              this.plugin.settings.autoSaveDelay = n;
              await this.plugin.saveSettings();
            }
          }),
      );
  }
}
