// Vault access layer for Inkwell inside Obsidian.
// Uses the Obsidian DataAdapter (`app.vault.adapter`) to mirror Inkwell's
// readDirectory / readFile semantics — but operating on the *current vault*
// instead of an arbitrary picked folder.

import { App, TFile, Vault } from 'obsidian';
import { FileNode, Backlink, RENDERABLE_EXTS, extOf, classifyFile } from './types';

// Dirs that are not worth browsing inside a reader.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist',
  'build', 'target', '__pycache__', '.cache', '.turbo', 'vendor',
  '.obsidian', '.trash',
]);

export interface ListResult {
  files: string[];
  folders: string[];
}

/** List one directory level (vault-relative path; "" = vault root). */
export async function listDirectory(
  adapter: import('obsidian').DataAdapter,
  dirPath: string,
): Promise<FileNode[]> {
  const base = dirPath || '';
  let result: ListResult;
  try {
    result = await adapter.list(base);
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  for (const folder of result.folders) {
    const name = folder.split('/').pop() || folder;
    if (name.startsWith('.')) continue;
    if (SKIP_DIRS.has(name.toLowerCase())) continue;
    nodes.push({ name, path: folder, isDir: true, ext: undefined, children: undefined });
  }

  for (const file of result.files) {
    const name = file.split('/').pop() || file;
    if (name.startsWith('.')) continue;
    nodes.push({ name, path: file, isDir: false, ext: extOf(name), children: undefined });
  }

  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return nodes;
}

/** Recursively list a directory up to `depth` levels. */
export async function listDirectoryRecursive(
  adapter: import('obsidian').DataAdapter,
  dirPath: string,
  depth = 2,
): Promise<FileNode[]> {
  const nodes = await listDirectory(adapter, dirPath);
  if (depth <= 0) return nodes;
  for (const node of nodes) {
    if (node.isDir) {
      node.children = await listDirectoryRecursive(adapter, node.path, depth - 1);
    }
  }
  return nodes;
}

/** Read a file's text content. */
export async function readFileContent(
  adapter: import('obsidian').DataAdapter,
  filePath: string,
): Promise<string> {
  return adapter.read(filePath);
}

/** Flatten a tree into a list of file nodes (dirs excluded). */
export function flattenTree(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (!node.isDir) files.push(node);
    if (node.children) files.push(...flattenTree(node.children));
  }
  return files;
}

/** Collect all renderable files (html/md/yaml) in the vault (or a subfolder). */
export function collectRenderableFiles(vault: Vault, scope?: string): TFile[] {
  const all = vault.getFiles();
  return all.filter((f) => {
    if (scope && !f.path.startsWith(scope.endsWith('/') ? scope : scope + '/')) return false;
    return RENDERABLE_EXTS.has(extOf(f.name));
  });
}

/**
 * Find references (backlinks) to the current file across renderable vault files.
 * Matches: [[name]], [[name|alias]], markdown links to the file, HTML hrefs,
 * and plain mentions of the bare file name (best-effort).
 */
export async function findReferences(
  app: App,
  target: { name: string; path: string },
  scope?: string,
): Promise<Backlink[]> {
  const { vault } = app;
  const baseName = target.name.replace(/\.[^.]+$/, '');
  const fullName = target.name;

  const candidates = collectRenderableFiles(vault, scope).filter(
    (f) => f.path !== target.path,
  );

  const results: Backlink[] = [];

  for (const file of candidates) {
    let content: string;
    try {
      content = await vault.cachedRead(file);
    } catch {
      continue;
    }
    if (!content) continue;

    const patterns: RegExp[] = [
      new RegExp(`\\[\\[${escapeRegExp(baseName)}(?:\\|[^\\]]+)?\\]\\]`),
      new RegExp(`\\[\\[${escapeRegExp(fullName)}(?:\\|[^\\]]+)?\\]\\]`),
      new RegExp(`\\]\\([^)]*${escapeRegExp(target.path)}[^)]*\\)`),
      new RegExp(`\\]\\([^)]*${escapeRegExp(fullName)}[^)]*\\)`),
      new RegExp(`href=["'][^"']*${escapeRegExp(fullName)}[^"']*["']`),
    ];

    let hit = -1;
    let hitRaw = '';
    for (const re of patterns) {
      const m = re.exec(content);
      if (m) {
        hit = m.index;
        hitRaw = m[0];
        break;
      }
    }

    if (hit >= 0) {
      const start = Math.max(0, hit - 30);
      const end = Math.min(content.length, hit + hitRaw.length + 30);
      const context = content.substring(start, end).replace(/\n/g, ' ').trim();
      results.push({
        name: file.name,
        path: file.path,
        context,
        ext: extOf(file.name),
      });
    }
  }

  return results;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Folder portion (display label) for a file path. */
export function folderOf(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

/** Re-export classify for convenience. */
export { classifyFile };
