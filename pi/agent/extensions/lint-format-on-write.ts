import fs from 'node:fs';
import path from 'node:path';
import {
  isEditToolResult,
  isWriteToolResult,
  type ExtensionAPI,
  type ExtensionContext,
  type ToolResultEvent,
} from '@earendil-works/pi-coding-agent';

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
      ctx,
      pi
    );
    const lintFixErrors = formatLintErrors(lintFixResult);
    if (!lintFixErrors) {
      await runCommand(oxfmtCommand, filePath, repositoryRoot, ctx, pi);
      return;
    }

    const lintCheckResult = await runCommand(
      oxlintCheckCommand,
      filePath,
      repositoryRoot,
      ctx,
      pi
    );
    const lintCheckErrors = formatLintErrors(lintCheckResult);
    if (!lintCheckErrors) {
      await runCommand(oxfmtCommand, filePath, repositoryRoot, ctx, pi);
      return;
    }

    return {
      content: [...event.content, { type: 'text', text: lintCheckErrors }],
      ...(event.structuredContent === undefined
        ? {}
        : { structuredContent: event.structuredContent }),
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
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

async function runCommand(
  command: readonly string[],
  filePath: string,
  cwd: string,
  ctx: ExtensionContext,
  pi: ExtensionAPI
): Promise<CommandResult> {
  try {
    const relativeFilePath = path.relative(cwd, filePath);
    const result = await pi.exec(
      '/usr/bin/env',
      [
        `PATH=${getCommandPath(cwd)}`,
        command[0],
        ...command.slice(1),
        relativeFilePath,
      ],
      { cwd, signal: ctx.signal }
    );

    return {
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch {
    return { exitCode: null, stdout: '', stderr: '' };
  }
}

function getCommandPath(cwd: string) {
  return [...getNodeModulesBinPaths(cwd), process.env.PATH]
    .filter(Boolean)
    .join(path.delimiter);
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
