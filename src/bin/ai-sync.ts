// Generate derived AI instructions and reference indexes.
//
// - Update generated AI files:
//
// `ai-sync`
//
// - Check whether generated AI files are current:
//
// `ai-sync --check`
//
// - Update vendored AI references, then generated files:
//
// `ai-sync --update`

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  generatePersonaSections,
  generateWebGuideIndex,
  parsePersona,
} from '../util/docs.ts';
import { dirs } from '../util/files.ts';
import { didFilesChange, mirrorFolder } from '../util/sync.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  { name: 'check', type: 'boolean', default: false },
  { name: 'update', type: 'boolean', default: false },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const WEB_GUIDES_DIRECTORY = path.join(
  dirs.ai,
  'skills/_references/web-guides'
);
const WEB_GUIDE_INDEX_PATH = path.join(WEB_GUIDES_DIRECTORY, 'Index.md');
const WEB_GUIDE_REPOSITORY = 'GoogleChrome/modern-web-guidance';
const WEB_GUIDE_SOURCE_PATH = 'skills/modern-web-guidance/guides';
/** Paths skipped during upstream sync. */
const WEB_GUIDE_MIRROR_IGNORE = [
  '^built-in-ai/',
  '^webmcp/',
  '^passkeys/',
  '^(?:Index|Readme)\\.md$',
];

async function loadPersonas(): Promise<ReadonlyMap<string, string>> {
  const personaPaths = await Array.fromAsync(
    fs.glob(path.join(dirs.ai, 'personas/*.md'))
  );
  const personas = new Map<string, string>();

  for (const personaPath of personaPaths.toSorted()) {
    const personaName = path.basename(personaPath, '.md');
    const source = await fs.readFile(personaPath, 'utf8');
    personas.set(personaName, parsePersona(source, personaName));
  }

  return personas;
}

async function updateWebGuides(): Promise<void> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ai-sync-')
  );
  const repositoryDirectory = path.join(temporaryDirectory, 'repository');

  try {
    execFileSync(
      'gh',
      [
        'repo',
        'clone',
        WEB_GUIDE_REPOSITORY,
        repositoryDirectory,
        '--',
        '--depth',
        '1',
        '--filter=blob:none',
        '--sparse',
      ],
      { stdio: 'inherit' }
    );
    execFileSync(
      'git',
      [
        '-C',
        repositoryDirectory,
        'sparse-checkout',
        'set',
        WEB_GUIDE_SOURCE_PATH,
      ],
      { stdio: 'inherit' }
    );

    const sourceDirectory = path.join(
      repositoryDirectory,
      WEB_GUIDE_SOURCE_PATH
    );
    const entries = await mirrorFolder(
      sourceDirectory,
      WEB_GUIDES_DIRECTORY,
      WEB_GUIDE_MIRROR_IGNORE
    );
    if (didFilesChange(entries)) {
      console.log('Updated web guides.');
    } else {
      console.log('Web guides are already current.');
    }
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function aiSync({ check, update }: Options): Promise<void> {
  if (check && update) {
    throw new Error('Cannot combine --check and --update.');
  }
  if (update) {
    await updateWebGuides();
  }

  const personas = await loadPersonas();
  const changes: { path: string; generated: string }[] = [];
  const skillPaths = await Array.fromAsync(
    fs.glob(path.join(dirs.ai, 'skills/*/SKILL.md'))
  );
  const targetPaths = [
    path.join(dirs.ai, 'base-prompt.md'),
    ...skillPaths.toSorted(),
  ];

  for (const targetPath of targetPaths) {
    const source = await fs.readFile(targetPath, 'utf8');
    const relativePath = path.relative(dirs.dotfiles, targetPath);
    const generated = generatePersonaSections(source, personas, relativePath);
    if (generated !== source) {
      changes.push({ path: targetPath, generated });
    }
  }

  const webGuidePaths = await Array.fromAsync(
    fs.glob(path.join(WEB_GUIDES_DIRECTORY, '**/*.md'))
  );
  const webGuides = await Promise.all(
    webGuidePaths
      .map((guidePath) => ({
        guidePath,
        relativePath: path.relative(WEB_GUIDES_DIRECTORY, guidePath),
      }))
      .filter(({ relativePath }) => path.dirname(relativePath) !== '.')
      .map(async ({ guidePath, relativePath }) => ({
        relativePath,
        source: await fs.readFile(guidePath, 'utf8'),
      }))
  );
  const generatedWebGuideIndex = generateWebGuideIndex(webGuides);
  let currentWebGuideIndex = '';
  try {
    currentWebGuideIndex = await fs.readFile(WEB_GUIDE_INDEX_PATH, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  if (generatedWebGuideIndex !== currentWebGuideIndex) {
    changes.push({
      path: WEB_GUIDE_INDEX_PATH,
      generated: generatedWebGuideIndex,
    });
  }

  if (check) {
    if (changes.length > 0) {
      const stalePaths = changes
        .map(({ path: targetPath }) => path.relative(dirs.dotfiles, targetPath))
        .join('\n  ');
      throw new Error(`Generated AI files are stale:\n  ${stalePaths}`);
    }
    console.log('Generated AI files are current.');
    return;
  }

  for (const change of changes) {
    await fs.writeFile(change.path, change.generated);
    console.log(`Updated ${path.relative(dirs.dotfiles, change.path)}`);
  }

  if (changes.length === 0) {
    console.log('Generated AI files are already current.');
  }
}

await run(import.meta.url, () => aiSync(parseArgs(OPTIONS)));
