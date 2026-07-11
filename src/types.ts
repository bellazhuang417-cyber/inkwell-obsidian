// Ported from Inkwell (htmlnote/src/types/index.ts) and adapted for Obsidian.
// File paths here are vault-relative (e.g. "Projects/report.html").

/** A node in the file tree. */
export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  ext?: string;
  children?: FileNode[];
}

/** Classification of a file by its extension. */
export type FileType = 'html' | 'md' | 'yaml' | 'other';

/** Currently open file in the Inkwell reader. */
export interface OpenFile {
  path: string;
  name: string;
  ext: string;
  content: string;
  folder: string;
  fileType: FileType;
}

/** Which rendering mode is active for the content area. */
export type ViewType = 'empty' | 'html' | 'md' | 'yaml';

/** A backlink / reference found pointing at the current file. */
export interface Backlink {
  name: string;
  path: string;
  context: string;
  ext: string;
}

/** An outgoing link detected inside the current file. */
export interface Outlink {
  target: string;
  raw: string;
  context: string;
}

/** Extensions Inkwell renders as first-class content. */
export const RENDERABLE_EXTS = new Set(['html', 'htm', 'md', 'mdx', 'yaml', 'yml']);

export function extOf(name: string): string {
  return name.includes('.') ? (name.split('.').pop() || '').toLowerCase() : '';
}

export function classifyFile(ext: string): FileType {
  const e = ext.toLowerCase();
  if (e === 'html' || e === 'htm') return 'html';
  if (e === 'md' || e === 'mdx') return 'md';
  if (e === 'yaml' || e === 'yml') return 'yaml';
  return 'other';
}
