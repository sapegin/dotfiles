// Tldr/tlrc wrapper to show docs from `~/dotfiles/docs` or `~/dotfiles/bin`.
// > More information: <https://github.com/tldr-pages/tlrc>
//
// - Show docs:
//
// `help {{command}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOTFILES_DIR } from '../util/consts.ts';

const BIN_DIR = path.join(DOTFILES_DIR, 'bin');
const BIN_TS_DIR = path.join(DOTFILES_DIR, 'src/bin');
const DOCS_DIR = path.join(DOTFILES_DIR, 'docs');
const CONFIG = path.join(DOTFILES_DIR, 'tilde/.tlrc.toml');

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

function getDocs(source: string, name: string): string {
  const commentRaw = source.match(/((?:(?:\/\/|#)\s+[^\n]+\n)+)/m);
  if (commentRaw === null) {
    return '';
  }

  const comment = commentRaw[1].replaceAll(/(^|\n)(?:\/\/|#)\s*/gm, '\n');

  const [docs] = comment.split('---');

  return `# ${name}\n\n> ${docs.trim()}`;
}

function getTldrMd(query: string): string | undefined {
  const mdFilePath = path.join(DOCS_DIR, `${query}.md`);
  if (fs.existsSync(mdFilePath)) {
    return mdFilePath;
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

  return tempMdFile;
}

function runTldr(args: readonly string[]): void {
  execFileSync('tldr', ['--config', CONFIG, ...args], { stdio: 'inherit' });
}

const [query, ...restArgs] = process.argv.slice(2);

if (query) {
  const md = getTldrMd(query);
  if (md === undefined) {
    runTldr([query, ...restArgs]);
  } else {
    runTldr(['--render', md]);
  }
} else {
  runTldr(['--render', path.join(DOCS_DIR, 'Readme.md')]);
}
