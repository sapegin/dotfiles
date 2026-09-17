/*
 * Collects project folder paths and ranks them by fuzzy search with word-initial
 * abbreviation priority.
 *
 * Used by `j` and `tinycast/project-opener`.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

// Can't import files.ts here as it breaks in Tinycast
function untildify(input: string): string {
  if (input.startsWith('~/')) {
    return path.join(HOME, input.slice(2));
  }
  return input;
}

// Abbreviation bonuses beat fuzzy-only matches; keep them far above
// length/index tie-breakers.
//
// - Prefix: query matches the start of word initials (`rt` → `raccoon-toolbox`,
//   `rt`).
// - Subsequence: query letters appear in order within initials, but not at the
//   start (`dw` → `dg_stage_web`, `dsw`).
const ABBREVIATION_PREFIX_BONUS = 10_000;
const ABBREVIATION_SUBSEQUENCE_BONUS = 5000;

/** `WORK_PROJECTS_DIR` from `~/.env`. Tinycast’s runtime has no `util.parseEnv`. */
function workProjectsDirFromEnv(): string | undefined {
  const envFile = untildify('~/.env');
  if (fs.existsSync(envFile) === false) {
    return undefined;
  }

  const prefix = 'WORK_PROJECTS_DIR=';
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const assignment = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    if (assignment.startsWith(prefix) === false) {
      continue;
    }

    let value = assignment.slice(prefix.length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value.length === 0 ? undefined : value;
  }

  return undefined;
}

const workProjectsDir = workProjectsDirFromEnv();

// Each entry is either a fixed path (`~/dotfiles`) or a parent directory (`~/_/*`).
// Array order is search/display priority.
const PROJECT_SOURCES: string[] = [
  '~/cloud',
  '~/murder',
  '~/dotfiles',
  '~/_/*',
  ...(workProjectsDir === undefined ? [] : [`${workProjectsDir}/*`]),
];

function getDirs(directory: string): string[] {
  if (fs.existsSync(directory) === false) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function expandSource(source: string): string[] {
  const absoluteSource = untildify(source);

  if (absoluteSource.endsWith('/*')) {
    const directory = absoluteSource.slice(0, -2);
    return getDirs(directory).map((name) => path.join(directory, name));
  }

  return [absoluteSource];
}

// Expand everything once at load.
const PROJECTS = PROJECT_SOURCES.flatMap((source) => expandSource(source));

/** Turn `dw` into `d.*w` for fuzzy matching against a normalized folder name. */
export function fuzzyfy(query: string): string {
  return query.match(/[a-z0-9]/gi)?.join('.*') ?? '';
}

function normalizeName(name: string): string {
  return name.replaceAll(/[^a-z0-9]/gi, '');
}

/** Word initials: `raccoon-toolbox` → `rt`. */
function getAbbreviation(name: string): string {
  return name
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 0)
    .map((word) => word.at(0)?.toLowerCase() ?? '')
    .join('');
}

function isSubsequence(haystack: string, needle: string): boolean {
  let needleIndex = 0;

  for (const character of haystack) {
    if (character === needle.at(needleIndex)) {
      needleIndex++;
    }

    if (needleIndex === needle.length) {
      return true;
    }
  }

  return false;
}

function scoreAbbreviation(name: string, query: string): number {
  const normalizedQuery = normalizeName(query).toLowerCase();
  if (normalizedQuery.length === 0) {
    return 0;
  }

  const abbreviation = getAbbreviation(name);
  if (abbreviation.startsWith(normalizedQuery)) {
    return ABBREVIATION_PREFIX_BONUS - normalizedQuery.length;
  }
  if (isSubsequence(abbreviation, normalizedQuery)) {
    return ABBREVIATION_SUBSEQUENCE_BONUS - abbreviation.length;
  }

  return 0;
}

export function scoreProjectMatch(
  projectPath: string,
  query: string
): number | null {
  const folderName = path.basename(projectPath);
  const normalizedName = normalizeName(folderName);
  const match = new RegExp(fuzzyfy(query), 'i').exec(normalizedName);
  if (match === null) {
    return null;
  }

  // Higher is better: abbreviation bonus, then shorter names, then earlier
  // fuzzy match.
  return (
    scoreAbbreviation(folderName, query) - normalizedName.length - match.index
  );
}

export function searchProjects(query: string): string[] {
  if (query.length === 0) {
    return PROJECTS;
  }

  return PROJECTS.flatMap((projectPath, index) => {
    const score = scoreProjectMatch(projectPath, query);
    return score === null ? [] : [{ projectPath, index, score }];
  })
    .toSorted((a, b) => b.score - a.score || a.index - b.index)
    .map(({ projectPath }) => projectPath);
}
