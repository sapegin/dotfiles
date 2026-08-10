import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { exts, getStem } from './files.ts';

export interface CallApfelOptions {
  /** Path passed to apfel `-f`. */
  readonly inputPath?: string;
  /** When set, written to a temp file and passed to apfel `-f`. */
  readonly inputContent?: string;
  readonly systemPrompt: string;
  readonly schema: Record<string, unknown>;
  readonly userPrompt: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

/**
 * Runs `apfel` with a JSON schema and returns the parsed model output.
 * Provide either `inputPath` or `inputContent`.
 */
export function callApfel<T>(options: CallApfelOptions): T {
  if (
    (options.inputPath === undefined) ===
    (options.inputContent === undefined)
  ) {
    throw new Error(
      'callApfel requires exactly one of inputPath or inputContent.'
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apfel-'));
  const schemaPath = path.join(tempDir, 'schema.json');
  const inputPath = options.inputPath ?? path.join(tempDir, 'input.txt');

  try {
    fs.writeFileSync(schemaPath, JSON.stringify(options.schema));
    if (options.inputContent !== undefined) {
      fs.writeFileSync(inputPath, options.inputContent);
    }

    const args = [
      '-f',
      inputPath,
      '-s',
      options.systemPrompt,
      '--schema',
      schemaPath,
      '-o',
      'json',
      '-q',
      '--temperature',
      String(options.temperature ?? 0),
    ];
    if (options.maxTokens !== undefined) {
      args.push('--max-tokens', String(options.maxTokens));
    }
    args.push(options.userPrompt);

    let output: string;
    try {
      output = execFileSync('apfel', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const execError = error as NodeJS.ErrnoException & { stderr?: string };
      const detail = execError.stderr?.trim() ?? execError.message;
      throw new Error(detail);
    }

    const parsed = JSON.parse(output) as { content: string };
    return JSON.parse(parsed.content) as T;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const DOCLING_EXTENSIONS = ['.pdf', ...exts.image] as const;

export interface DoclingExtractResult {
  readonly sourcePath: string;
  readonly markdownPath: string;
  readonly skipped: boolean;
}

export interface ExtractDocumentOptions {
  readonly force?: boolean;
}

/** Return the markdown sidecar path for a document's OCR output. */
export function getMarkdownSidecarPath(sourcePath: string): string {
  return path.join(path.dirname(sourcePath), `${getStem(sourcePath)}.md`);
}

/** Whether Docling can extract text from this file type. */
export function isDoclingSupportedDocument(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return DOCLING_EXTENSIONS.includes(extension);
}

/**
 * True when the markdown sidecar exists and is at least as new as the source
 * file.
 */
export async function isDoclingExtractFresh(
  sourcePath: string
): Promise<boolean> {
  const markdownPath = getMarkdownSidecarPath(sourcePath);
  try {
    const [sourceStat, markdownStat] = await Promise.all([
      fsPromises.stat(sourcePath),
      fsPromises.stat(markdownPath),
    ]);
    return markdownStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {
    return false;
  }
}

/**
 * Run Docling on a PDF or image and write a reusable markdown sidecar next to
 * the source: `{name}.md`.
 */
export async function extractDocument(
  sourcePath: string,
  options: ExtractDocumentOptions = {}
): Promise<DoclingExtractResult> {
  const absoluteSource = path.resolve(sourcePath);
  if (isDoclingSupportedDocument(absoluteSource) === false) {
    throw new Error(`Unsupported document type: ${absoluteSource}`);
  }

  const markdownPath = getMarkdownSidecarPath(absoluteSource);
  if (options.force !== true && (await isDoclingExtractFresh(absoluteSource))) {
    return {
      sourcePath: absoluteSource,
      markdownPath,
      skipped: true,
    };
  }

  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'docling-'));
  const basename = getStem(absoluteSource);

  try {
    try {
      execFileSync(
        'docling',
        [
          'convert',
          absoluteSource,
          '--to',
          'md',
          '--output',
          tempDir,
          '--image-export-mode',
          'placeholder',
          '--ocr-engine',
          'ocrmac',
          '--ocr-lang',
          'en-US,de-DE,es-ES,ru-RU',
          '--device',
          'mps',
          '-q',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (error) {
      const execError = error as NodeJS.ErrnoException & { stderr?: string };
      const detail = execError.stderr?.trim() ?? execError.message;
      throw new Error(detail);
    }

    const tempMarkdown = path.join(tempDir, `${basename}.md`);
    await fsPromises.rename(tempMarkdown, markdownPath);

    return {
      sourcePath: absoluteSource,
      markdownPath,
      skipped: false,
    };
  } finally {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  }
}
