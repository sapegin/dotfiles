// Collect package-manager, runtime, workspace, script, and outdated evidence.
// Run from the project root; this command does not install or update packages.
//
// `deps-context`

import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { parseArgs } from '../util/args.ts';
import { doesPathExist, readJson } from '../util/files.ts';
import { isRecord } from '../util/json.ts';
import { captureCommand } from '../util/process.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [] as const;
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

interface Manifest {
  name?: string;
  packageManager?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Gather exact package evidence while leaving upgrade and verification choices
 * to the agent.
 */
export async function depsContext(root = process.cwd()): Promise<void> {
  const manifestPath = path.join(root, 'package.json');
  if ((await doesPathExist(manifestPath)) === false) {
    throw new UserError(
      `Run from a project root containing package.json: ${root}`
    );
  }
  const manifest = await readJson<Manifest>(manifestPath);
  const npmLock = await doesPathExist(path.join(root, 'package-lock.json'));
  const pnpmLock = await doesPathExist(path.join(root, 'pnpm-lock.yaml'));
  const declaredManager =
    manifest.packageManager?.match(/^(npm|pnpm)(?:@|$)/)?.[1];
  const manager = (npmLock && 'npm') || (pnpmLock && 'pnpm') || declaredManager;
  if (manager === undefined) {
    throw new UserError(
      'No npm/pnpm lockfile or supported packageManager field; ask which manager to use.'
    );
  }
  let patterns: unknown = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  if (manager === 'pnpm' && (await doesPathExist(workspaceFile))) {
    const workspace: unknown = YAML.parse(
      await fs.readFile(workspaceFile, 'utf8')
    );
    if (isRecord(workspace) === false) {
      throw new UserError('pnpm-workspace.yaml must contain a mapping.');
    }
    patterns = workspace.packages ?? [];
  }
  if (
    Array.isArray(patterns) === false ||
    patterns.some((pattern) => typeof pattern !== 'string')
  ) {
    throw new UserError(
      'Workspace packages must be an array of glob patterns.'
    );
  }
  const workspacePatterns = patterns as string[];
  const included = workspacePatterns
    .filter((pattern) => pattern.startsWith('!') === false)
    .map((pattern) => `${pattern.replace(/\/$/, '')}/package.json`);
  const excluded = workspacePatterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => `${pattern.slice(1).replace(/\/$/, '')}/package.json`);
  const files =
    included.length === 0
      ? []
      : await Array.fromAsync(
          fs.glob(included, {
            cwd: root,
            exclude: ['**/node_modules/**', ...excluded],
          })
        );
  const projects = [];
  for (const file of [...new Set(['package.json', ...files])].toSorted()) {
    const directory = path.dirname(file);
    const projectRoot = path.join(root, directory);
    const project = await readJson<Manifest>(path.join(root, file));
    const runtime: Record<string, string | null> = {
      engines: project.engines?.node ?? null,
    };
    for (const name of ['.nvmrc', '.node-version']) {
      const runtimePath = path.join(projectRoot, name);
      const version = (await doesPathExist(runtimePath))
        ? await fs.readFile(runtimePath, 'utf8')
        : null;
      runtime[name] = version?.trim() ?? null;
    }
    const args =
      manager === 'npm'
        ? ['outdated', '--json', '--long', '--workspaces=false']
        : ['outdated', '--format', 'json', '--no-color'];
    const { stdout, status } = captureCommand(manager, args, {
      cwd: projectRoot,
      acceptedExitCodes: [0, 1],
    });
    let outdated: unknown;
    try {
      outdated = stdout.trim() === '' && status === 0 ? {} : JSON.parse(stdout);
    } catch (error) {
      if (error instanceof SyntaxError === false) {
        throw error;
      }
      throw new UserError(
        `${manager} outdated returned invalid JSON for ${directory}: ${stdout.trim()}`
      );
    }
    if (
      isRecord(outdated) === false ||
      (status === 1 && Object.keys(outdated).length === 0)
    ) {
      throw new UserError(
        `${manager} outdated failed for ${directory}: ${stdout.trim()}`
      );
    }
    const packages = Object.entries(outdated).map(([name, versions]) => {
      if (isRecord(versions) === false || typeof versions.latest !== 'string') {
        throw new UserError(
          `${manager} outdated returned invalid package metadata for ${directory}: ${stdout.trim()}`
        );
      }
      return {
        package: name,
        current: versions.current ?? null,
        wanted: versions.wanted ?? null,
        latest: versions.latest,
        dependencyType:
          versions.dependencyType ??
          versions.type ??
          DEPENDENCY_FIELDS.find(
            (field) => project[field]?.[name] !== undefined
          ) ??
          null,
        deprecated: versions.deprecated ?? versions.isDeprecated ?? null,
      };
    });
    projects.push({
      directory,
      name: project.name ?? null,
      runtime,
      scripts: project.scripts ?? {},
      outdated: packages,
    });
  }
  console.log(
    JSON.stringify(
      {
        root,
        manager,
        packageManager: manifest.packageManager ?? null,
        runningNode: process.version,
        workspaces: workspacePatterns,
        projects,
      },
      null,
      2
    )
  );
}

await run(import.meta.url, async () => {
  parseArgs(OPTIONS);
  await depsContext();
});
