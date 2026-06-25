import { execFile } from 'node:child_process';
import fs from 'node:fs';
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

const oxlintFixCommand = ['oxlint', '--fix', '--quiet'] as const;
const oxlintCheckCommand = ['oxlint', '--quiet'] as const;
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

    const repositoryRoot = getRepositoryRoot(filePath);
    const lintFixResult = await runCommand(
      oxlintFixCommand,
      filePath,
      repositoryRoot,
      ctx
    );
    const lintFixErrors = formatLintErrors(lintFixResult);
    if (!lintFixErrors) {
      await runCommand(oxfmtCommand, filePath, repositoryRoot, ctx);
      return;
    }

    const lintCheckResult = await runCommand(
      oxlintCheckCommand,
      filePath,
      repositoryRoot,
      ctx
    );
    const lintCheckErrors = formatLintErrors(lintCheckResult);
    if (!lintCheckErrors) {
      await runCommand(oxfmtCommand, filePath, repositoryRoot, ctx);
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

function getRepositoryRoot(filePath: string) {
  return findRepositoryRoot(path.dirname(filePath)) ?? path.dirname(filePath);
}

function findRepositoryRoot(startPath: string) {
  let currentPath = startPath;

  while (true) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }
    currentPath = parentPath;
  }
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
  cwd: string,
  ctx: ExtensionContext
): Promise<CommandResult> {
  try {
    const relativeFilePath = path.relative(cwd, filePath);
    const { stdout, stderr } = await execFileAsync(
      command[0],
      [...command.slice(1), relativeFilePath],
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
