import os from 'node:os';
import path from 'node:path';

export const PHOTOS_ROOT = path.join(os.homedir(), 'Pictures/Photos');

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

export const JPEG_EXTENSIONS = new Set(['.jpg', '.jpeg']);
