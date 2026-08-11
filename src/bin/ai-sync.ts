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
  generateReferenceIndex,
  parsePersona,
  type ReferenceIndexSection,
} from '../util/docs.ts';
import { dirs } from '../util/files.ts';
import { didFilesChange, mirrorFolder } from '../util/sync.ts';
import { capitalizeFirst } from '../util/text.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  { name: 'check', type: 'boolean', default: false },
  { name: 'update', type: 'boolean', default: false },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

interface ReferenceSource {
  ignore: readonly string[];
  loadIndexSections: (directory: string) => Promise<ReferenceIndexSection[]>;
  name: string;
  repository: string;
  sourcePath: string;
}

const REACT_SECTION_PATTERN = /^## \d+\. (.+) \(([^)]+)\)$/gm;
const REFERENCES_DIRECTORY = path.join(dirs.ai, 'skills/_references');
const REFERENCE_SOURCES = [
  {
    name: 'Modern web guidance',
    repository: 'GoogleChrome/modern-web-guidance',
    sourcePath: 'skills/modern-web-guidance/guides',
    ignore: [
      '^built-in-ai/',
      '^webmcp/',
      '^passkeys/',
      '^(?:Index|Readme)\\.md$',
    ],
    loadIndexSections: loadWebGuideIndexSections,
  },
  {
    name: 'React best practices',
    repository: 'vercel-labs/agent-skills',
    sourcePath: 'skills/react-best-practices/rules',
    ignore: ['^_template\\.md$', '^(?:Index|Readme)\\.md$'],
    loadIndexSections: loadReactBestPracticesIndexSections,
  },
] satisfies readonly ReferenceSource[];

function getReferenceDirectory(sourcePath: string): string {
  return path.join(
    REFERENCES_DIRECTORY,
    path.basename(path.dirname(sourcePath))
  );
}

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

function formatWebGuideWords(value: string): string {
  return value
    .split('-')
    .map((word) => {
      switch (word) {
        case 'ai':
        case 'css':
        case 'html':
        case 'js':
        case 'ui':
          return word.toUpperCase();
        default:
          return capitalizeFirst(word);
      }
    })
    .join(' ');
}

/** Collect categorized index sections from modern web guidance files. */
export function collectWebGuideIndexSections(
  guides: readonly { relativePath: string; source: string }[]
): ReferenceIndexSection[] {
  const guidesByCategory = new Map<string, { path: string; title: string }[]>();

  for (const guide of guides.toSorted((first, second) =>
    first.relativePath.localeCompare(second.relativePath)
  )) {
    const separatorIndex = guide.relativePath.indexOf('/');
    if (separatorIndex === -1) {
      throw new Error(`${guide.relativePath} must be inside a category.`);
    }

    const category = guide.relativePath.slice(0, separatorIndex);
    const fileName = guide.relativePath.slice(
      guide.relativePath.lastIndexOf('/') + 1
    );
    const heading = guide.source.match(/^# (.+)$/m)?.[1]?.trim();
    const title =
      heading === undefined || heading === ''
        ? formatWebGuideWords(fileName.replace(/\.md$/, ''))
        : heading;
    const categoryGuides = guidesByCategory.get(category) ?? [];
    categoryGuides.push({ path: guide.relativePath, title });
    guidesByCategory.set(category, categoryGuides);
  }

  return [...guidesByCategory].map(([category, links]) => ({
    links,
    title: formatWebGuideWords(category),
  }));
}

/** Collect categorized index sections from React best-practice rules. */
export function collectReactBestPracticesIndexSections(
  rules: readonly { relativePath: string; source: string }[],
  sectionsSource: string
): ReferenceIndexSection[] {
  const sections = [...sectionsSource.matchAll(REACT_SECTION_PATTERN)].map(
    ([, title, prefix]) => ({ title, prefix })
  );
  if (sections.length === 0) {
    throw new Error('React best-practice sections are missing.');
  }

  const rulesByPrefix = new Map<string, { path: string; title: string }[]>();
  for (const rule of rules.toSorted((first, second) =>
    first.relativePath.localeCompare(second.relativePath)
  )) {
    const prefix = rule.relativePath.split('-', 1)[0];
    const title = rule.source.match(/^title: (.+)$/m)?.[1]?.trim();
    if (title === undefined || title === '') {
      throw new Error(`${rule.relativePath} has invalid rule metadata.`);
    }
    const prefixRules = rulesByPrefix.get(prefix) ?? [];
    prefixRules.push({ path: rule.relativePath, title });
    rulesByPrefix.set(prefix, prefixRules);
  }

  const indexSections = sections.map((section) => {
    const links = rulesByPrefix.get(section.prefix) ?? [];
    rulesByPrefix.delete(section.prefix);
    return { links, title: section.title };
  });

  if (rulesByPrefix.size > 0) {
    throw new Error(
      `React best-practice rules have unknown prefixes: ${[...rulesByPrefix.keys()].join(', ')}`
    );
  }

  return indexSections;
}

async function loadWebGuideIndexSections(
  directory: string
): Promise<ReferenceIndexSection[]> {
  const guidePaths = await Array.fromAsync(
    fs.glob(path.join(directory, '**/*.md'))
  );
  const guides = await Promise.all(
    guidePaths
      .map((guidePath) => ({
        guidePath,
        relativePath: path.relative(directory, guidePath),
      }))
      .filter(({ relativePath }) => path.dirname(relativePath) !== '.')
      .map(async ({ guidePath, relativePath }) => ({
        relativePath,
        source: await fs.readFile(guidePath, 'utf8'),
      }))
  );
  return collectWebGuideIndexSections(guides);
}

async function loadReactBestPracticesIndexSections(
  directory: string
): Promise<ReferenceIndexSection[]> {
  const rulePaths = await Array.fromAsync(
    fs.glob(path.join(directory, '*.md'))
  );
  const rules = await Promise.all(
    rulePaths
      .filter((rulePath) => path.basename(rulePath).startsWith('_') === false)
      .filter(
        (rulePath) =>
          ['Index.md', 'Readme.md'].includes(path.basename(rulePath)) === false
      )
      .map(async (rulePath) => ({
        relativePath: path.basename(rulePath),
        source: await fs.readFile(rulePath, 'utf8'),
      }))
  );
  const sections = await fs.readFile(
    path.join(directory, '_sections.md'),
    'utf8'
  );
  return collectReactBestPracticesIndexSections(rules, sections);
}

async function updateReferenceDirectory({
  ignore,
  name,
  repository,
  sourcePath,
}: ReferenceSource): Promise<void> {
  const destination = getReferenceDirectory(sourcePath);
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
        repository,
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
      ['-C', repositoryDirectory, 'sparse-checkout', 'set', sourcePath],
      { stdio: 'inherit' }
    );

    const entries = await mirrorFolder(
      path.join(repositoryDirectory, sourcePath),
      destination,
      ignore
    );
    if (didFilesChange(entries)) {
      console.log(`Updated ${name}.`);
    } else {
      console.log(`${name} are already current.`);
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
    for (const referenceSource of REFERENCE_SOURCES) {
      await updateReferenceDirectory(referenceSource);
    }
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

  for (const { loadIndexSections, name, sourcePath } of REFERENCE_SOURCES) {
    const directory = getReferenceDirectory(sourcePath);
    const indexPath = path.join(directory, 'Index.md');
    const sections = await loadIndexSections(directory);
    const generated = generateReferenceIndex(name, sections);
    let current = '';
    try {
      current = await fs.readFile(indexPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    if (generated !== current) {
      changes.push({ path: indexPath, generated });
    }
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
