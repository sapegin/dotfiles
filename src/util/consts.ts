import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const dirs = {
  home: HOME,
  dotfiles: path.resolve(import.meta.dirname, '..', '..'),
  projects: path.join(HOME, '_'),
  obsidianVault: path.join(HOME, 'murder'),
  iCloud: path.join(HOME, 'cloud'),
  documents: path.join(HOME, 'Documents'),
  pictures: path.join(HOME, 'Pictures'),
  photos: path.join(HOME, 'Pictures', 'Photos'),
} as const;

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
