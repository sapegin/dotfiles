import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';

let directory: string;
let project: string;
let commands: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-context-'));
  project = path.join(directory, 'project');
  commands = path.join(directory, 'commands');
  fs.mkdirSync(project);
  fs.writeFileSync(
    path.join(project, 'package.json'),
    JSON.stringify({
      name: 'project',
      engines: { node: '>=24' },
      scripts: { test: 'vitest run' },
      devDependencies: { example: '^1.0.0' },
    })
  );
  const executable = `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
fs.appendFileSync(process.env.CALLS, JSON.stringify({ command: path.basename(process.argv[1]), args: process.argv.slice(2), cwd: process.cwd() }) + '\\n');
if (process.env.DIAGNOSTIC) console.error(process.env.DIAGNOSTIC);
console.log(process.env.OUTDATED);
process.exit(Number(process.env.OUTDATED_STATUS));
`;
  for (const name of ['npm', 'pnpm']) {
    fs.writeFileSync(path.join(directory, name), executable, { mode: 0o755 });
  }
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

function collect(output = '{}', status = 0, diagnostic = '') {
  return spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, 'deps-context.ts')],
    {
      cwd: project,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        CALLS: commands,
        OUTDATED: output,
        OUTDATED_STATUS: String(status),
        DIAGNOSTIC: diagnostic,
      },
    }
  );
}

test('prefers npm lockfile and reports runtime declarations, scripts, and outdated versions', () => {
  fs.writeFileSync(path.join(project, 'package-lock.json'), '{}');
  fs.writeFileSync(path.join(project, 'pnpm-lock.yaml'), '');
  fs.writeFileSync(path.join(project, '.nvmrc'), '24\n');
  const result = collect(
    JSON.stringify({
      example: {
        current: '1.0.0',
        wanted: '1.2.0',
        latest: '2.0.0',
        type: 'devDependencies',
      },
    }),
    1
  );
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.manager).toBe('npm');
  expect(output.projects[0]).toMatchObject({
    directory: '.',
    runtime: { engines: '>=24', '.nvmrc': '24', '.node-version': null },
    scripts: { test: 'vitest run' },
  });
  expect(output.projects[0].outdated[0]).toMatchObject({
    package: 'example',
    current: '1.0.0',
    wanted: '1.2.0',
    latest: '2.0.0',
    dependencyType: 'devDependencies',
  });
  expect(fs.readFileSync(commands, 'utf8')).toContain('--workspaces=false');
});

test('collects pnpm workspace packages individually and honors exclusion patterns', () => {
  fs.writeFileSync(path.join(project, 'pnpm-lock.yaml'), '');
  fs.writeFileSync(
    path.join(project, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n  - '!packages/excluded'\n"
  );
  for (const name of ['one', 'excluded']) {
    fs.mkdirSync(path.join(project, 'packages', name), { recursive: true });
    fs.writeFileSync(
      path.join(project, 'packages', name, 'package.json'),
      JSON.stringify({ name, dependencies: { example: '*' } })
    );
  }
  const result = collect(
    JSON.stringify({
      example: {
        current: '1.0.0',
        latest: '2.0.0',
        dependencyType: 'dependencies',
        isDeprecated: true,
      },
    }),
    1
  );
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.manager).toBe('pnpm');
  expect(
    output.projects.map((entry: { directory: string }) => entry.directory)
  ).toStrictEqual(['.', 'packages/one']);
  expect(output.projects[1].outdated[0]).toMatchObject({
    wanted: null,
    deprecated: true,
    dependencyType: 'dependencies',
  });
  const calls = fs
    .readFileSync(commands, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(calls).toHaveLength(2);
  expect(calls[0].args).toStrictEqual([
    'outdated',
    '--format',
    'json',
    '--no-color',
  ]);
});

test('uses packageManager when no lockfile exists and supports npm workspaces', () => {
  fs.writeFileSync(
    path.join(project, 'package.json'),
    JSON.stringify({ packageManager: 'npm@11.0.0', workspaces: ['packages/*'] })
  );
  fs.mkdirSync(path.join(project, 'packages/one'), { recursive: true });
  fs.writeFileSync(path.join(project, 'packages/one/package.json'), '{}');
  const result = collect();
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).projects).toHaveLength(2);
});

test('never treats command failures or malformed output as a clean dependency tree', () => {
  fs.writeFileSync(path.join(project, 'package-lock.json'), '{}');
  for (const [output, status] of [
    ['{}', 1],
    ['not JSON', 1],
    ['{"error":{"code":"E401"}}', 1],
    ['{"code":"ERR_PNPM_FETCH_401","message":"Denied"}', 1],
    ['[]', 0],
    ['{"example":{}}', 0],
  ] as const) {
    expect(collect(output, status).status).not.toBe(0);
  }
  const failure = collect('{}', 2, 'Registry unavailable');
  expect(failure.status).toBe(2);
  expect(failure.stderr).toBe('Registry unavailable\n');
  expect(failure.stdout).not.toContain('"projects"');
});

test('requires a known manager instead of guessing', () => {
  const result = collect();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ask which manager');
  expect(fs.existsSync(commands)).toBe(false);
});
