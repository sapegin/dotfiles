// Local photo album server: Lightroom export folder → JSON index → LAN gallery.
//
// `photo-album` — build/refresh the index and serve on the LAN.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { servePhotoAlbum } from '../photo-album/serve.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export async function photoAlbum(_options: Options): Promise<void> {
  await servePhotoAlbum();
}

await run(import.meta.url, () => photoAlbum(parseArgs(OPTIONS)));
