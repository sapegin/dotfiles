import {
  isToolCallEventType,
  type ExtensionAPI,
} from '@earendil-works/pi-coding-agent';

/**
 * Pi extension that asks for permission before running destructive shell
 * commands.
 *
 * It intercepts bash tool calls, checks the full command text against a small
 * deny-list of destructive Git and filesystem patterns, and blocks execution
 * unless the user explicitly allows it.
 */
const choiceAllow = 'Allow';
const ChoiceDeny = 'Deny, provide reason';
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

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `Blocked destructive command (${reason}); no UI available for permission.`,
      };
    }

    const choice = await ctx.ui.select(
      `Permission required\n\nMy Lord, I want to run this destructive command:\n\n${event.input.command}`,
      [choiceAllow, ChoiceDeny, choiceRanManually]
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
    if (choice === ChoiceDeny) {
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
    caseSensitive?: boolean;
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
      regex: /\bgit\s+branch\b/,
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

  for (const { regex, reason, skipForEchoRg, caseSensitive } of patterns) {
    if (skipForEchoRg && isEchoOrRg) {
      continue;
    }

    const target = caseSensitive ? command : lowerCommand;
    if (regex.test(target)) {
      return reason;
    }
  }

  return undefined;
}
