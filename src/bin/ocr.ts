// Extract structured OCR from PDFs and images with Docling.
//
// Writes a reusable markdown sidecar next to each source file: `{name}.md`.
//
// - Extract one file:
//
// `ocr scan.pdf`
//
// - Extract matching files:
//
// `ocr "~/cloud/Inbox/*.pdf"`
//
// - Re-extract even when sidecars are up to date:
//
// `ocr scan.pdf --force`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDocument, isDoclingSupportedDocument } from '../util/ai.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { tildify, untildify } from '../util/files.ts';
import { log, run, theme } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'pattern',
    positional: true,
    required: true,
  },
  {
    name: 'force',
    type: 'boolean',
    default: false,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export async function ocr({ pattern, force }: Options): Promise<void> {
  const files = await Array.fromAsync(fs.glob(untildify(pattern)));
  if (files.length === 0) {
    log.warn(`No files matched: ${pattern}`);
    return;
  }

  let extracted = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files.toSorted()) {
    if (isDoclingSupportedDocument(filePath) === false) {
      log.warn(`Skipped (unsupported type): ${tildify(filePath)}`);
      failed++;
      continue;
    }

    try {
      const result = await extractDocument(filePath, { force });
      if (result.skipped) {
        console.error(
          `${theme.muted('Skipped')} ${tildify(result.sourcePath)} (up to date)`
        );
        skipped++;
        continue;
      }

      console.log(tildify(result.markdownPath));
      extracted++;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      log.warn(`Failed: ${path.basename(filePath)}\n${detail}`);
      failed++;
    }
  }

  console.error();
  log.heading(
    `Done: ${extracted} extracted, ${skipped} skipped, ${failed} failed`
  );
}

await run(import.meta.url, () => ocr(parseArgs(OPTIONS)));
