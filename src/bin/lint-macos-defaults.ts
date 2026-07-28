// Lint macos-defaults script against the current Mac: obsolete domains and
// value drift.
//
// `lint-macos`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  type DefaultsEntry,
  isInvalidTypeFlags,
  expandShellVars,
  parseBool,
  parseEntries,
  stripQuotes,
} from '../util/defaults.ts';
import { dirs } from '../util/files.ts';
import { log, run } from '../util/tui.ts';

const SCRIPT_FILE = path.join(dirs.dotfiles, 'bin/macos-defaults');
const OBSOLETE_DOMAIN_PATTERN = /Domain com\.[\w.]+\s+does not exist/;

interface DriftIssue {
  kind: 'drift';
  raw: string;
  expected: string;
  current: string;
}

interface ObsoleteIssue {
  kind: 'obsolete';
  raw: string;
  detail: string;
}

type Issue = DriftIssue | ObsoleteIssue;

function stderrFromError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'stderr' in error &&
    Buffer.isBuffer(error.stderr)
  ) {
    return error.stderr.toString('utf8');
  }
  return error instanceof Error ? error.message : String(error);
}

function readDefaults(
  entry: DefaultsEntry,
  ...args: string[]
): { ok: true; value: string } | { ok: false; stderr: string } {
  const command = entry.sudo ? 'sudo' : 'defaults';
  const argv = [
    ...(entry.sudo ? ['defaults'] : []),
    ...(entry.currentHost ? ['-currentHost'] : []),
    ...args,
  ];

  try {
    const value = execFileSync(command, argv, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, stderr: stderrFromError(error) };
  }
}

function valuesMatch(entry: DefaultsEntry, actual: string): boolean {
  switch (entry.valueType) {
    case 'bool':
      return parseBool(actual) === entry.expected;
    case 'int':
      return Number.parseInt(actual, 10) === entry.expected;
    case 'float':
      return (
        Math.abs(Number.parseFloat(actual) - Number(entry.expected)) < 0.0001
      );
    case 'string':
      return (
        stripQuotes(actual) ===
        expandShellVars(String(entry.expected))
      );
  }
}

function formatExpected(entry: DefaultsEntry): string {
  return typeof entry.expected === 'string'
    ? `"${entry.expected}"`
    : String(entry.expected);
}

function lintEntries(entries: readonly DefaultsEntry[]): Issue[] {
  const issues: Issue[] = [];

  for (const entry of entries) {
    const current = readDefaults(entry, 'read', entry.domain, entry.key);
    if (current.ok === false) {
      const domain = readDefaults(entry, 'read', entry.domain);
      if (domain.ok === false && OBSOLETE_DOMAIN_PATTERN.test(domain.stderr)) {
        issues.push({
          kind: 'obsolete',
          raw: entry.raw,
          detail: `Domain no longer exists on this macOS version (${entry.domain})`,
        });
      }
      continue;
    }

    if (valuesMatch(entry, current.value) === false) {
      issues.push({
        kind: 'drift',
        raw: entry.raw,
        expected: formatExpected(entry),
        current: current.value,
      });
    }
  }

  return issues;
}

function printIssues(label: string, issues: Issue[]): void {
  if (issues.length === 0) {
    return;
  }

  console.log();
  log.heading(`${label} (${issues.length})`);
  for (const [index, issue] of issues.entries()) {
    console.log(issue.raw);
    if (issue.kind === 'drift') {
      console.log(`  Expected:  ${issue.expected}`);
      console.log(`  Currently: ${issue.current}`);
    } else {
      console.log(`  ${issue.detail}`);
    }
    if (index < issues.length - 1) {
      console.log();
    }
  }
}

function printInvalidTypeFlags(lines: readonly string[]): void {
  console.log();
  log.heading(`Invalid type flags (${lines.length})`);
  for (const [index, line] of lines.entries()) {
    console.log(line);
    console.log(
      '  Use -bool, -int, -float, or -string instead of -boolean, -integer, or -real'
    );
    if (index < lines.length - 1) {
      console.log();
    }
  }
}

function main(): void {
  let entries: DefaultsEntry[];
  try {
    entries = parseEntries(fs.readFileSync(SCRIPT_FILE, 'utf8'));
  } catch (error) {
    if (isInvalidTypeFlags(error)) {
      printInvalidTypeFlags(error.lines);
      process.exit(1);
    }
    throw error;
  }
  const issues = lintEntries(entries);
  const obsolete = issues.filter(
    (issue): issue is ObsoleteIssue => issue.kind === 'obsolete'
  );
  const drift = issues.filter(
    (issue): issue is DriftIssue => issue.kind === 'drift'
  );

  console.log(`Found ${entries.length} defaults`);
  printIssues('Obsolete', obsolete);
  printIssues('Drift', drift);

  if (issues.length > 0) {
    process.exit(1);
  }

  console.log('\nAll checked entries match this Mac.');
}

await run(main);
