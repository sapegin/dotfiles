// Run accessibility checks against a URL or a file of URLs using pa11y-ci or axe-core.
//
// - Check a local page:
//
// `lint-accessibility http://localhost:3000/`
//
// - Check pages listed in a file, one URL per line:
//
// `lint-accessibility --file urls.txt`
//
// - Use axe-core instead of pa11y-ci:
//
// `lint-accessibility --backend axe http://localhost:3000/`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../util/args.ts';
import { dirs } from '../util/files.ts';
import { log } from '../util/tui.ts';

const PA11Y_CONFIG_FILE = path.join(
  dirs.dotfiles,
  'accessibility/pa11y-ci.json'
);

const args = parseArgs([
  {
    name: 'url',
    positional: true,
  },
  {
    name: 'file',
    alias: 'f',
  },
  {
    name: 'backend',
    alias: 'b',
    default: 'pa11y',
    values: ['pa11y', 'axe'],
  },
]);

function fail(message: string): never {
  log.error(message);
  process.exit(1);
}

function readUrlsFromFile(file: string): string[] {
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not read URL file: ${message}`);
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && line.startsWith('#') === false);
}

function getUrlsToScan(
  url: string | undefined,
  file: string | undefined
): string[] {
  const urls = [
    ...(url === undefined ? [] : [url]),
    ...(file === undefined ? [] : readUrlsFromFile(file)),
  ];

  if (urls.length === 0) {
    fail('No URLs provided: pass a URL or --file with one URL per line');
  }

  return urls;
}

const urls = getUrlsToScan(args.url, args.file);

for (const pageUrl of urls) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    fail(`Invalid URL: ${pageUrl}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    fail(`Only HTTP(S) URLs are supported: ${pageUrl}`);
  }
}

const result = spawnSync(
  'npm',
  args.backend === 'axe'
    ? ['exec', '--yes', '--package', '@axe-core/cli', '--', 'axe', ...urls]
    : [
        'exec',
        '--yes',
        '--package',
        'pa11y-ci',
        '--',
        'pa11y-ci',
        '--config',
        PA11Y_CONFIG_FILE,
        ...urls,
      ],
  {
    stdio: 'inherit',
  }
);

if (result.error !== undefined) {
  fail(`Could not run npm: ${result.error.message}`);
}

process.exit(result.status ?? 1);
