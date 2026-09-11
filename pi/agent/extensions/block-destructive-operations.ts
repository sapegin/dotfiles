import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isToolCallEventType,
  type ExtensionAPI,
} from '@earendil-works/pi-coding-agent';

/**
 * Gates destructive shell commands, except simple removal of tracked, unchanged
 * project files.
 */
const choiceAllow = 'Allow';
const choiceDeny = 'Deny, provide reason';
const choiceRanManually = 'Continue, I ran the command myself';

export default function blockDestructiveOperations(pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (!isToolCallEventType('bash', event)) {
      return;
    }

    const reason = getDestructiveReason(event.input.command);
    if (!reason) {
      return;
    }

    // This preflight check can race sibling file mutations. That is an accepted
    // compromise to avoid overriding Bash execution and its mutation queue.
    if (
      reason === 'rm' &&
      (await isSafeProjectRm(pi, ctx.cwd, event.input.command, ctx.signal))
    ) {
      return;
    }

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `Blocked destructive command (${reason}); no UI available for permission.`,
      };
    }

    const choice = await ctx.ui.select(
      `Permission required\n\nMy Lord, I wish to run this dangerous command:\n\n${event.input.command}`,
      [choiceAllow, choiceDeny, choiceRanManually]
    );

    if (choice === choiceAllow) {
      return;
    }

    if (choice === choiceRanManually) {
      return {
        block: true,
        reason: 'User ran the command manually; do not run it again.',
      };
    }

    let userReason: string | undefined;
    if (choice === choiceDeny) {
      userReason = await ctx.ui.input(
        'Reason to provide to the agent:',
        `Destructive command blocked: ${reason}`
      );
    }

    const rejectionReason = userReason?.trim();
    const blockReason =
      rejectionReason === undefined || rejectionReason === ''
        ? `Destructive command blocked: ${reason}`
        : rejectionReason;

    return {
      block: true,
      reason: blockReason,
    };
  });
}

interface CommandExecutor {
  exec(
    command: string,
    args: string[],
    options?: { signal?: AbortSignal }
  ): Promise<{ code: number; stdout: string }>;
}

/**
 * Returns whether a deliberately limited `rm` command only removes tracked,
 * unchanged files beneath the current project directory.
 */
export async function isSafeProjectRm(
  executor: CommandExecutor,
  cwd: string,
  command: string,
  signal?: AbortSignal
) {
  const targets = parseSimpleRmTargets(command);
  if (!targets) {
    return false;
  }

  const projectRoot = await fs.realpath(cwd).catch(() => undefined);
  if (!projectRoot) {
    return false;
  }

  const gitRootResult = await executor.exec(
    'git',
    ['-C', projectRoot, 'rev-parse', '--show-toplevel'],
    { signal }
  );
  if (gitRootResult.code !== 0) {
    return false;
  }

  const gitRoot = await fs
    .realpath(gitRootResult.stdout.trim())
    .catch(() => undefined);
  if (!gitRoot || !isWithinDirectory(projectRoot, gitRoot)) {
    return false;
  }

  for (const target of targets) {
    const targetPath = path.resolve(projectRoot, target);
    if (!isWithinDirectory(targetPath, projectRoot)) {
      return false;
    }

    const targetStats = await fs.lstat(targetPath).catch(() => undefined);
    if (
      !targetStats ||
      (!targetStats.isFile() && !targetStats.isSymbolicLink())
    ) {
      return false;
    }

    const realParent = await fs
      .realpath(path.dirname(targetPath))
      .catch(() => undefined);
    if (!realParent || !isWithinDirectory(realParent, projectRoot)) {
      return false;
    }

    const gitPath = path.relative(gitRoot, targetPath);
    const trackedResult = await executor.exec(
      'git',
      [
        '-C',
        gitRoot,
        '--literal-pathspecs',
        'ls-files',
        '-v',
        '--error-unmatch',
        '--',
        gitPath,
      ],
      { signal }
    );
    if (trackedResult.code !== 0 || !trackedResult.stdout.startsWith('H ')) {
      return false;
    }

    const unchangedResult = await executor.exec(
      'git',
      [
        '-C',
        gitRoot,
        '--literal-pathspecs',
        'diff',
        '--quiet',
        '--no-ext-diff',
        '--',
        gitPath,
      ],
      { signal }
    );
    if (unchangedResult.code !== 0) {
      return false;
    }
  }

  return true;
}

function parseSimpleRmTargets(command: string) {
  if (/[^\S ]|['"`\\$*?[\]{}~;|&<>()]/u.test(command)) {
    return undefined;
  }

  const tokens = command.trim().split(/ +/);
  if (tokens.shift() !== 'rm') {
    return undefined;
  }

  const targets: string[] = [];
  let optionsEnded = false;
  for (const token of tokens) {
    if (!optionsEnded && token === '--') {
      optionsEnded = true;
    } else if (!optionsEnded && token === '-f') {
      continue;
    } else if (!optionsEnded && token.startsWith('-')) {
      return undefined;
    } else if (path.isAbsolute(token) || token.split(/[\\/]/).includes('..')) {
      return undefined;
    } else {
      targets.push(token);
    }
  }

  return targets.length === 0 ? undefined : targets;
}

function isWithinDirectory(candidatePath: string, directory: string) {
  return (
    candidatePath === directory ||
    candidatePath.startsWith(`${directory}${path.sep}`)
  );
}

export function getDestructiveReason(command: string) {
  const lowerCommand = command.toLowerCase();
  const strippedCommand = lowerCommand.trimStart();
  const isEchoOrRg =
    strippedCommand.startsWith('echo ') || strippedCommand.startsWith('rg ');

  // These expressions intentionally scan raw shell text rather than parsing
  // shell syntax; that keeps the extension small, conservative, and testable.
  const patterns: {
    regex: RegExp;
    reason: string;
    skipForEchoRg?: boolean;
  }[] = [
    {
      regex: /(^|[^\w])\\?r\\?m(\s|$)/,
      reason: 'rm',
    },
    {
      regex: /(^|[^\w])mv(\s|$)/,
      reason: 'mv',
    },
    {
      regex: /\bchmod\b/,
      reason: 'chmod',
    },
    {
      regex: /\bchown\b/,
      reason: 'chown',
    },
    {
      regex: /\bsudo\b/,
      reason: 'sudo',
    },
    {
      regex: /\bgit\s+reset\b/,
      reason: 'git reset',
    },
    {
      regex: /\bgit\s+clean\b/,
      reason: 'git clean',
    },
    {
      regex: /\bgit\s+checkout\b/,
      reason: 'git checkout',
    },
    {
      regex: /\bgit\s+switch\b/,
      reason: 'git switch',
    },
    {
      regex: /\bgit\s+rebase\b/,
      reason: 'git rebase',
    },
    {
      regex: /\bgit\s+push\b/,
      reason: 'git push',
    },
    {
      regex:
        /\bgit\s+branch\b[^|;&\n]*(?:\s-(?!-)[^\s|;&]*[dfmc][^\s|;&]*|\s--(?:delete|force|move|copy|set-upstream-to|unset-upstream|edit-description|track|no-track|create-reflog)\b)/,
      reason: 'git branch',
    },
    {
      regex:
        /\bgit\s+tag\s+[^|;]*(-[^\s]*d[^\s]*|--de(?:l(?:e(?:t(?:e)?)?)?)?)\b/,
      reason: 'git tag -d',
    },
    {
      regex: /\bgit\s+stash\s+(pop|drop|clear)\b/,
      reason: 'git stash pop/drop/clear',
    },
    {
      regex: /\bgit\s+commit\b/,
      reason: 'git commit',
    },
    {
      regex: /\bgit\s+restore\b/,
      reason: 'git restore',
    },
    {
      regex: /\bfind\b[^\n;|&]*\s-delete\b/,
      reason: 'find -delete',
      skipForEchoRg: true,
    },
  ];

  for (const { regex, reason, skipForEchoRg } of patterns) {
    if (skipForEchoRg && isEchoOrRg) {
      continue;
    }

    if (regex.test(lowerCommand)) {
      return reason;
    }
  }

  return undefined;
}
