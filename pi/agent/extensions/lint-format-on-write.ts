import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  isEditToolResult,
  isWriteToolResult,
  type ExtensionAPI,
  type ExtensionContext,
  type ToolResultEvent,
} from '@earendil-works/pi-coding-agent';

const execFileAsync = promisify(execFile);

const eslintFixCommand = ['eslint', '--fix', '--quiet'] as const;
const eslintCheckCommand = ['eslint', '--quiet'] as const;
const oxlintFixCommand = ['oxlint', '--fix', '--quiet'] as const;
const oxlintCheckCommand = ['oxlint', '--quiet'] as const;
const prettierCommand = [
  'prettier',
  '--write',
  '--log-level',
  'silent',
] as const;
const oxfmtCommand = ['oxfmt', '--write'] as const;

/** Run linter and formatter after every file change. */
export default function lintFormatOnWrite(pi: ExtensionAPI) {
  pi.on('tool_result', async (event, ctx) => {
    if (
      event.isError ||
      (!isWriteToolResult(event) && !isEditToolResult(event))
    ) {
      return;
    }

    const filePath = getWrittenPath(event, ctx);
    if (!filePath) {
      return;
    }

    const commands = await getProjectCommands(filePath);
    const lintFixResult = await runCommand(commands.lintFix, filePath, ctx);
    const lintFixErrors = formatLintErrors(lintFixResult);
    if (!lintFixErrors) {
      await runCommand(commands.format, filePath, ctx);
      return;
    }

    const lintCheckResult = await runCommand(commands.lintCheck, filePath, ctx);
    const lintCheckErrors = formatLintErrors(lintCheckResult);
    if (!lintCheckErrors) {
      await runCommand(commands.format, filePath, ctx);
      return;
    }

    return {
      content: [...event.content, { type: 'text', text: lintCheckErrors }],
      details: event.details,
      isError: event.isError,
    };
  });
}

function getWrittenPath(event: ToolResultEvent, ctx: ExtensionContext) {
  const inputPath =
    typeof event.input.path === 'string' ? event.input.path : undefined;
  if (!inputPath) {
    return undefined;
  }

  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(ctx.cwd, inputPath);
}

interface ProjectCommands {
  lintFix: readonly string[];
  lintCheck: readonly string[];
  format: readonly string[];
}

async function getProjectCommands(filePath: string): Promise<ProjectCommands> {
  const packageJson = await readProjectPackageJson(path.dirname(filePath));
  const dependencies = getDependencies(packageJson);

  return {
    lintFix: dependencies.has('oxlint') ? oxlintFixCommand : eslintFixCommand,
    lintCheck: dependencies.has('oxlint')
      ? oxlintCheckCommand
      : eslintCheckCommand,
    format: dependencies.has('oxfmt') ? oxfmtCommand : prettierCommand,
  };
}

async function readProjectPackageJson(startPath: string): Promise<unknown> {
  const packageJsonPath = findProjectPackageJson(startPath);
  if (!packageJsonPath) {
    return undefined;
  }

  try {
    return JSON.parse(await fsPromises.readFile(packageJsonPath, 'utf8'));
  } catch {
    return undefined;
  }
}

function findProjectPackageJson(startPath: string) {
  let currentPath = startPath;

  while (true) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }
    currentPath = parentPath;
  }
}

function getDependencies(packageJson: unknown) {
  const dependencies = new Set<string>();
  if (!isRecord(packageJson)) {
    return dependencies;
  }

  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const entries = packageJson[field];
    if (!isRecord(entries)) {
      continue;
    }

    for (const dependency of Object.keys(entries)) {
      dependencies.add(dependency);
    }
  }

  return dependencies;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface CommandResult {
  command: readonly string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

async function runCommand(
  command: readonly string[],
  filePath: string,
  ctx: ExtensionContext
): Promise<CommandResult> {
  try {
    const cwd = path.dirname(filePath);
    const { stdout, stderr } = await execFileAsync(
      command[0],
      [...command.slice(1), path.basename(filePath)],
      {
        cwd,
        env: getCommandEnv(cwd),
        signal: ctx.signal,
      }
    );

    return { command, exitCode: 0, stdout, stderr };
  } catch (error) {
    if (isExecFileError(error)) {
      return {
        command,
        exitCode: typeof error.code === 'number' ? error.code : null,
        stdout: stringifyOutput(error.stdout),
        stderr: stringifyOutput(error.stderr),
        error: error.message,
      };
    }

    return {
      command,
      exitCode: null,
      stdout: '',
      stderr: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type ExecFileError = Error & {
  code?: number | string;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};

function isExecFileError(error: unknown): error is ExecFileError {
  return error instanceof Error;
}

function stringifyOutput(output: string | Buffer | undefined) {
  return Buffer.isBuffer(output) ? output.toString('utf8') : (output ?? '');
}

function getCommandEnv(cwd: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...getNodeModulesBinPaths(cwd), process.env.PATH]
      .filter(Boolean)
      .join(path.delimiter),
  };
}

function getNodeModulesBinPaths(cwd: string) {
  const paths: string[] = [];
  let currentPath = cwd;

  while (true) {
    paths.push(path.join(currentPath, 'node_modules/.bin'));
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return paths;
    }
    currentPath = parentPath;
  }
}

function formatLintErrors(lintResult: CommandResult) {
  if (lintResult.exitCode !== 1) {
    return undefined;
  }

  const output = [lintResult.stdout.trim(), lintResult.stderr.trim()]
    .filter(Boolean)
    .join('\n');
  if (!output) {
    return undefined;
  }

  return output;
}
