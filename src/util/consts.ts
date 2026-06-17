import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const DOTFILES_DIR = path.resolve(import.meta.dirname, '..', '..');

export const PROJECTS_DIR = path.join(HOME, '_');

export const OBSIDIAN_VAULT_DIR = path.join(HOME, 'murder');

export const DOCUMENTS_ROOT = path.join(HOME, 'Documents');

export const PHOTOS_ROOT = path.join(HOME, 'Pictures/Photos');

export const JPEG_EXTENSIONS = new Set(['.jpg', '.jpeg']);

// XXX: It doesn't have .avif
export const IMAGE_EXTENSIONS = [
  ...JPEG_EXTENSIONS,
  '.bmp',
  '.gif',
  '.heic',
  '.mov',
  '.png',
  '.tiff',
  '.webp',
];

export const RAW_EXTENSIONS = new Set([
  '.raf',
  '.cr2',
  '.cr3',
  '.nef',
  '.arw',
  '.dng',
  '.orf',
  '.rw2',
  '.pef',
  '.srw',
]);
