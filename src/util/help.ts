import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dirs } from './files.ts';

const BIN_DIR = path.join(dirs.dotfiles, 'bin');
const BIN_TS_DIR = path.join(dirs.dotfiles, 'src/bin');
const DOCS_DIR = path.join(dirs.dotfiles, 'docs');
const CONFIG = path.join(dirs.dotfiles, 'tilde/.tlrc.toml');

function getSourceFilepath(name: string): string | undefined {
  const binTsFilePath = path.join(BIN_TS_DIR, `${name}.ts`);
  if (fs.existsSync(binTsFilePath)) {
    return binTsFilePath;
  }

  const binFilePath = path.join(BIN_DIR, name);
  if (fs.existsSync(binFilePath)) {
    return binFilePath;
  }
}

function formatDocs(source: string): string {
  const output: string[] = [];
  let currentLine = '';

  const flushCurrentLine = (): void => {
    if (currentLine !== '') {
      output.push(currentLine);
      currentLine = '';
    }
  };

  for (const sourceLine of source.trim().split('\n')) {
    const line = sourceLine.trim();
    if (line === '') {
      flushCurrentLine();
      if (output.at(-1) !== '') {
        output.push('');
      }
    } else if (sourceLine.startsWith('  ') || line.startsWith('* ')) {
      flushCurrentLine();
      output.push(`> ${line}`);
    } else if (/^(?:-|>|`)/.test(line)) {
      flushCurrentLine();
      currentLine = line;
    } else if (currentLine === '') {
      currentLine = `> ${line}`;
    } else {
      currentLine += ` ${line}`;
    }
  }

  flushCurrentLine();
  return output.join('\n');
}

export function getDocs(source: string, name: string): string {
  const sourceLines = source.split('\n');
  const commentStart = sourceLines.findIndex((line) =>
    /^(?:\/\/|#)(?: |$)/.test(line)
  );
  if (commentStart === -1) {
    return '';
  }

  const remainingLines = sourceLines.slice(commentStart);
  const commentEnd = remainingLines.findIndex(
    (line) => /^(?:\/\/|#)(?: |$)/.test(line) === false
  );
  const commentLines = remainingLines
    .slice(0, commentEnd === -1 ? undefined : commentEnd)
    .map((line) => line.replace(/^(?:\/\/|#) ?/, ''));
  const separatorIndex = commentLines.indexOf('---');
  const docsLines =
    separatorIndex === -1
      ? commentLines
      : commentLines.slice(0, separatorIndex);
  const docs = formatDocs(docsLines.join('\n'));

  return docs === '' ? '' : `# ${name}\n\n${docs}`;
}

interface RenderedTldrMd {
  readonly md: string;
  readonly tempDir?: string;
}

function getTldrMd(query: string): RenderedTldrMd | undefined {
  const mdFilePath = path.join(DOCS_DIR, `${query}.md`);
  if (fs.existsSync(mdFilePath)) {
    return { md: mdFilePath };
  }

  const sourceFilepath = getSourceFilepath(query);
  if (sourceFilepath === undefined) {
    return undefined;
  }

  const source = fs.readFileSync(sourceFilepath, 'utf8');
  const docs = getDocs(source, query);

  if (docs === '') {
    return undefined;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotfiles-'));
  const tempMdFile = path.join(tempDir, `${query}.md`);
  fs.writeFileSync(tempMdFile, docs);

  return { md: tempMdFile, tempDir };
}

function runTldr(args: readonly string[]): void {
  execFileSync('tldr', ['--config', CONFIG, ...args], { stdio: 'inherit' });
}

/** Show TLDR docs for `args[0]`, forwarding any remaining args to tlrc. */
export function showHelp(args: readonly string[]): void {
  const [query, ...restArgs] = args;

  if (query) {
    const rendered = getTldrMd(query);
    if (rendered === undefined) {
      runTldr([query, ...restArgs]);
      return;
    }
    try {
      runTldr(['--render', rendered.md]);
    } finally {
      if (rendered.tempDir !== undefined) {
        fs.rmSync(rendered.tempDir, { recursive: true, force: true });
      }
    }
  } else {
    runTldr(['--render', path.join(DOCS_DIR, 'Readme.md')]);
  }
}
