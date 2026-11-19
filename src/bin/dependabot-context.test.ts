import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dependabot-context-'));
  fs.writeFileSync(
    path.join(directory, 'gh'),
    `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (process.env.GH_FAIL) {
  console.error('access denied');
  process.exit(1);
}
if (args[0] === 'repo') {
  console.log('acme/project');
} else {
  if (!args.includes('--paginate') || !args.includes('--slurp')) process.exit(99);
  console.log(process.env.ALERT_PAGES);
}
`,
    { mode: 0o755 }
  );
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

function alert(
  number: number,
  manifest = 'package.json',
  patched: string | null = '1.2.3'
) {
  return {
    number,
    dependency: {
      package: { name: 'example', ecosystem: 'npm' },
      manifest_path: manifest,
      relationship: 'direct',
      scope: 'runtime',
    },
    security_advisory: {
      ghsa_id: 'GHSA-example',
      severity: 'high',
      summary: 'Example advisory',
    },
    security_vulnerability: {
      vulnerable_version_range: '< 1.2.3',
      first_patched_version: patched === null ? null : { identifier: patched },
    },
    html_url: `https://github.com/acme/project/security/dependabot/${number}`,
  };
}

function collect(pages: unknown, fail = false) {
  return spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, 'dependabot-context.ts')],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        CALLS: path.join(directory, 'calls'),
        ALERT_PAGES: JSON.stringify(pages),
        GH_FAIL: fail ? '1' : '',
      },
    }
  );
}

test('collects all pages and groups without losing alert IDs or patch metadata', () => {
  const result = collect([
    [alert(1), alert(2)],
    [alert(3, 'other/package.json', null)],
  ]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.count).toBe(3);
  expect(output.severities).toStrictEqual({
    critical: 0,
    high: 3,
    medium: 0,
    low: 0,
  });
  expect(
    output.groups.map(
      (group: { alert_numbers: number[] }) => group.alert_numbers
    )
  ).toStrictEqual([[1, 2], [3]]);
  expect(output.alerts[2]).toMatchObject({
    patched_version: null,
    vulnerable_range: '< 1.2.3',
    scope: 'runtime',
  });
  expect(output.alerts[2].url).toContain('/3');
  expect(fs.readFileSync(path.join(directory, 'calls'), 'utf8')).toContain(
    'repos/acme/project/dependabot/alerts?state=open&per_page=100'
  );
});

test('distinguishes an empty result from an API failure', () => {
  const empty = collect([[]]);
  expect(empty.status).toBe(0);
  expect(JSON.parse(empty.stdout).count).toBe(0);
  const failure = collect([[]], true);
  expect(failure.status).toBe(1);
  expect(failure.stderr).toBe('access denied\n');
  expect(failure.stdout).toBe('');
});
