/*
 * Minimal Pi extension to prettify built-in tool rendering inspired by Amp.
 */

// oxlint-disable unicorn/no-nested-ternary
import os from 'node:os';
import {
  type ExtensionAPI,
  type ExtensionContext,
  type ReadonlyFooterDataProvider,
  type Theme,
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
  highlightCode,
} from '@earendil-works/pi-coding-agent';
import { truncateToWidth, Text, type Component, visibleWidth } from '@earendil-works/pi-tui';

/** Diff summary stats. */
export interface DiffStats {
  added: number;
  removed: number;
}

/**
 * Tokenize text the same way the `diff` package's `diffLines` does:
 * split on newlines, drop the trailing empty segment when the string
 * ends with a newline, and keep each line's terminator on the token.
 */
function tokenizeLines(value: string): string[] {
  const linesAndNewlines = value.split(/(\n|\r\n)/);

  if (linesAndNewlines.at(-1) === '') {
    linesAndNewlines.pop();
  }

  return linesAndNewlines.reduce<string[]>((lines, line, index) => {
    if (index % 2 === 1) {
      const lastIndex = lines.length - 1;
      return [...lines.slice(0, lastIndex), `${lines[lastIndex]}${line}`];
    }

    return [...lines, line];
  }, []);
}

function longestCommonSubsequenceLength(
  oldLines: readonly string[],
  newLines: readonly string[]
): number {
  const previous = Array.from({ length: newLines.length + 1 }, () => 0);
  const current = Array.from({ length: newLines.length + 1 }, () => 0);

  for (const oldLine of oldLines) {
    for (const [index, newLine] of newLines.entries()) {
      const column = index + 1;
      current[column] =
        oldLine === newLine
          ? previous[index] + 1
          : Math.max(previous[column], current[index]);
    }

    previous.splice(0, previous.length, ...current);
    current.fill(0);
  }

  return previous[newLines.length] ?? 0;
}

/** Count added and removed lines between two strings. */
export function getLineDiffStats(
  oldContent: string,
  newContent: string
): DiffStats {
  const oldLines = tokenizeLines(oldContent);
  const newLines = tokenizeLines(newContent);
  const unchanged = longestCommonSubsequenceLength(oldLines, newLines);

  return {
    added: newLines.length - unchanged,
    removed: oldLines.length - unchanged,
  };
}

/** Visual status of a tool execution, used to color the frame chrome. */
export type FrameStatus = 'pending' | 'success' | 'error';

function tildify(filepath: string) {
  return filepath.replace(os.homedir(), '~');
}

function formatContextWindowTokens(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1_000_000) {
    return `${Math.round(count / 1000)}K`;
  }
  return `${Math.round(count / 1_000_000)}M`;
}

function rightPadLine(left: string, right: string, width: number): string {
  const padding = Math.max(1, width - visibleWidth(left) - visibleWidth(right));
  return truncateToWidth(`${left}${' '.repeat(padding)}${right}`, width);
}

function rightAlignLine(content: string, width: number): string {
  const padding = Math.max(0, width - visibleWidth(content));
  return `${' '.repeat(padding)}${content}`;
}

function getSessionCost(ctx: ExtensionContext): number {
  return ctx.sessionManager.getEntries().reduce((total, entry) => {
    if (entry.type !== 'message' || entry.message.role !== 'assistant') {
      return total;
    }
    return total + entry.message.usage.cost.total;
  }, 0);
}

function formatContextUsageLabel(
  ctx: ExtensionContext,
  autoCompactEnabled: boolean,
): { label: string; percent: number | null } {
  const contextUsage = ctx.getContextUsage();
  const contextWindow =
    contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
  const contextPercent = contextUsage?.percent ?? null;
  const autoIndicator = autoCompactEnabled ? ' (auto)' : '';
  const windowLabel = formatContextWindowTokens(contextWindow);

  if (contextPercent === null) {
    return { label: `?/${windowLabel}${autoIndicator}`, percent: null };
  }

  return {
    label: `${Math.round(contextPercent)}%/${windowLabel}${autoIndicator}`,
    percent: contextPercent,
  };
}

function formatStatsLine(
  theme: Theme,
  costLabel: string | undefined,
  contextLabel: string,
  contextPercent: number | null,
): string {
  const plainStats = [costLabel, contextLabel].filter(Boolean).join(' ');

  if (contextPercent !== null && contextPercent > 90) {
    return `${costLabel === undefined ? '' : theme.fg('dim', `${costLabel} `)}${theme.fg('error', contextLabel)}`;
  }
  if (contextPercent !== null && contextPercent > 70) {
    return `${costLabel === undefined ? '' : theme.fg('dim', `${costLabel} `)}${theme.fg('warning', contextLabel)}`;
  }
  return theme.fg('dim', plainStats);
}

function renderPrettyFooter(
  ctx: ExtensionContext,
  pi: ExtensionAPI,
  theme: Theme,
  footerData: ReadonlyFooterDataProvider,
  width: number,
  autoCompactEnabled: boolean,
): string[] {
  const cwd = tildify(ctx.sessionManager.getCwd());
  const branch = footerData.getGitBranch();

  const modelName = ctx.model?.id ?? 'no-model';
  const thinkingLevel = pi.getThinkingLevel();
  const rightLine =
    ctx.model?.reasoning === true
      ? theme.fg(
          'dim',
          thinkingLevel === 'off'
            ? `${modelName} • thinking off`
            : `${modelName} • ${thinkingLevel}`,
        )
      : theme.fg('dim', modelName);

  const totalCost = getSessionCost(ctx);
  const usingSubscription =
    ctx.model === undefined ? false : ctx.modelRegistry.isUsingOAuth(ctx.model);
  const { label: contextLabel, percent: contextPercent } = formatContextUsageLabel(
    ctx,
    autoCompactEnabled,
  );
  const costLabel =
    totalCost > 0 || usingSubscription
      ? `$${totalCost.toFixed(2)}${usingSubscription ? ' (sub)' : ''}`
      : undefined;

  const statsContent = formatStatsLine(
    theme,
    costLabel,
    contextLabel,
    contextPercent,
  );
  const statsLine =
    branch === null
      ? rightAlignLine(statsContent, width)
      : rightPadLine(theme.fg('dim', branch), statsContent, width);

  return [
    rightPadLine(theme.fg('dim', cwd), rightLine, width),
    truncateToWidth(statsLine, width),
  ];
}

function registerFooter(pi: ExtensionAPI): void {
  let requestRender: (() => void) | undefined;
  let activeCtx: ExtensionContext | undefined;

  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) {
      return;
    }

    activeCtx = ctx;
    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => {
        tui.requestRender();
      };
      const unsubscribeBranch = footerData.onBranchChange(() => {
        requestRender?.();
      });

      return {
        dispose() {
          unsubscribeBranch();
          requestRender = undefined;
          activeCtx = undefined;
        },
        invalidate() {},
        render(width: number): string[] {
          if (activeCtx === undefined) {
            return [];
          }

          return renderPrettyFooter(
            activeCtx,
            pi,
            theme,
            footerData,
            width,
            true,
          );
        },
      };
    });
  });

  const refreshFooter = () => {
    requestRender?.();
  };

  pi.on('turn_end', refreshFooter);
  pi.on('model_select', refreshFooter);
  pi.on('thinking_level_select', refreshFooter);
  pi.on('session_compact', refreshFooter);

  pi.on('session_shutdown', () => {
    requestRender = undefined;
    activeCtx = undefined;
  });
}

function getTextComponent(ctx: { lastComponent?: Component }) {
  return (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);
}

function toolIcon(theme: Theme, status: FrameStatus): string {
  if (status === 'error') {
    return theme.fg('error', '✕');
  } else if (status === 'success') {
    return theme.fg('success', '✓');
  } else {
    return theme.fg('muted', '…');
  }
}

function toolTitle(theme: Theme, name: string, value: string): string {
  return `${theme.fg('toolTitle', theme.bold(name))} ${theme.fg('muted', value)}`;
}

function frameWidth(): number {
  return process.stdout.columns;
}

function firstLine(text: string): string {
  return text.replace(/\n$/, '').split('\n')[0];
}

function countLines(text: string): number {
  return text.replace(/\n$/, '').split('\n').length;
}

function formatError(theme: Theme, message: string): string {
  const truncatedMessage = truncateToWidth(
    firstLine(message),
    frameWidth() - 4,
    '…'
  );
  return `   ${theme.fg('dim', truncatedMessage)} `;
}

/**
 * Derive the visual status from a render context. Mirrors the contract
 * of pi's tool render hooks: `isError` wins over `isPartial`, and the
 * default is "success".
 */
export function getFrameStatus(ctx: {
  isError?: boolean;
  isPartial?: boolean;
}): FrameStatus {
  if (ctx.isError) {
    return 'error';
  }
  if (ctx.isPartial) {
    return 'pending';
  }
  return 'success';
}

/** Compact `+N -M` summary string with diff fg colors. */
function summarizeDiff(theme: Theme, added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) {
    parts.push(theme.fg('success', `+${added}`));
  }
  if (removed > 0) {
    parts.push(theme.fg('error', `−${removed}`));
  }
  return parts.length > 0 ? parts.join(' ') : theme.fg('dim', 'no changes');
}

function summarizeAll(theme: Theme, diffs: DiffStats[]): string {
  const added = diffs.reduce((total, diff) => total + diff.added, 0);
  const removed = diffs.reduce((total, diff) => total + diff.removed, 0);
  return summarizeDiff(theme, added, removed);
}

/**
 * After tools run, Pi emits a separate assistant message for the user-facing
 * reply. Prepend a markdown horizontal rule so it is visually separated from
 * the thinking and tool output above.
 */
const REPLY_SEPARATOR = '---\n\n';

let pendingReplySeparator = false;

function hasToolCalls(message: {
  content: readonly { type: string }[];
}): boolean {
  return message.content.some((block) => block.type === 'toolCall');
}

function firstTextBlockIndex(message: {
  content: readonly { type: string; text?: string }[];
}): number {
  return message.content.findIndex(
    (block) => block.type === 'text' && block.text?.trim()
  );
}

function withReplySeparator<
  T extends { role: string; content: { type: string; text?: string }[] },
>(message: T): T {
  const index = firstTextBlockIndex(message);
  if (index === -1) {
    return message;
  }

  const textBlock = message.content[index];
  if (textBlock.type !== 'text' || !textBlock.text) {
    return message;
  }

  if (textBlock.text.startsWith(REPLY_SEPARATOR)) {
    return message;
  }

  return {
    ...message,
    content: message.content.map((block, blockIndex) =>
      blockIndex === index && block.type === 'text'
        ? { ...block, text: `${REPLY_SEPARATOR}${block.text?.trimStart()}` }
        : block
    ),
  };
}

function registerReplySeparator(pi: ExtensionAPI): void {
  pi.on('agent_start', () => {
    pendingReplySeparator = false;
  });

  pi.on('turn_end', (event) => {
    if (event.toolResults.length > 0) {
      pendingReplySeparator = true;
    }
  });

  pi.on('message_end', (event) => {
    if (!pendingReplySeparator || event.message.role !== 'assistant') {
      return;
    }

    if (
      hasToolCalls(event.message) ||
      firstTextBlockIndex(event.message) === -1
    ) {
      return;
    }

    pendingReplySeparator = false;
    return { message: withReplySeparator(event.message) };
  });
}

export default function pretty(pi: ExtensionAPI) {
  const cwd = process.cwd();
  registerRead(pi, cwd);
  registerFind(pi, cwd);
  registerGrep(pi, cwd);
  registerBash(pi, cwd);
  registerLs(pi, cwd);
  registerWrite(pi, cwd);
  registerEdit(pi, cwd);
  registerReplySeparator(pi);
  registerFooter(pi);
}

function basicToolHeading(
  theme: Theme,
  titleAnsi: string,
  status: FrameStatus,
  extra?: string,
  error?: string
) {
  const maxWidth = frameWidth() - (extra ? extra.length + 1 : 0) - 4;
  const titleToDisplay = truncateToWidth(titleAnsi, maxWidth, '…');
  return [
    ' ' +
      [
        toolIcon(theme, status),
        titleToDisplay,
        extra ? theme.fg('dim', theme.italic(extra)) : undefined,
      ]
        .filter(Boolean)
        .join(' '),
    error ? formatError(theme, error) : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatReadError(message: string) {
  // ENOENT: no such file or directory, access '...'
  if (message.startsWith('ENOENT')) {
    return 'File not found';
  }
  return message;
}

function registerRead(pi: ExtensionAPI, cwd: string): void {
  const original = createReadTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const filepath = ctx.args.path;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Read', tildify(filepath)),
          getFrameStatus(ctx),
          undefined,
          ctx.isError ? formatReadError(content) : undefined
        )
      );

      return text;
    },
  });
}

function registerFind(pi: ExtensionAPI, cwd: string): void {
  const original = createFindTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const pattern = ctx.args.pattern;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Find', pattern),
          getFrameStatus(ctx),
          ctx.isPartial ? undefined : `${countLines(content)} items`,
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
}

function registerGrep(pi: ExtensionAPI, cwd: string): void {
  const original = createGrepTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const pattern = ctx.args.pattern;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Grep', pattern),
          getFrameStatus(ctx),
          ctx.isPartial ? undefined : `${countLines(content)} items`,
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
}

function registerLs(pi: ExtensionAPI, cwd: string): void {
  const original = createLsTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const root = tildify(ctx.args.path ?? '');
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'List', root),
          getFrameStatus(ctx),
          ctx.isPartial ? undefined : `${countLines(content)} items`,
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
}

function formatBashCommand(command: string) {
  const highlighted = highlightCode(command, 'bash');
  return highlighted.join(' ↵ ');
}

function registerBash(pi: ExtensionAPI, cwd: string): void {
  const original = createBashTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const command = formatBashCommand(ctx.args.command);
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      const summary = bashSummary(content, ctx.isPartial, ctx.isError);

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Bash', command),
          summary.status,
          undefined,
          summary.text
        )
      );

      return text;
    },
  });
}

function registerWrite(pi: ExtensionAPI, cwd: string): void {
  const original = createWriteTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const filepath = ctx.args.path;
      const content = ctx.args.content;
      const output =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Write', tildify(filepath)),
          getFrameStatus(ctx),
          ctx.isPartial
            ? theme.fg('success', `+${content.split('\n').length}`)
            : undefined,
          ctx.isError ? output : undefined
        )
      );

      return text;
    },
  });
}

function registerEdit(pi: ExtensionAPI, cwd: string): void {
  const original = createEditTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const filepath = ctx.args.path;
      const stats = ctx.args.edits.map((edit) =>
        getLineDiffStats(edit.oldText, edit.newText)
      );
      const summary = summarizeAll(theme, stats);

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Edit', tildify(filepath)),
          getFrameStatus(ctx),
          summary,
          // TODO: Test error reporting
          ctx.isError ? result.details.error : undefined
        )
      );

      return text;
    },
  });
}

function bashSummary(
  output: string,
  running: boolean,
  isError?: boolean
): { status: FrameStatus; text?: string } {
  if (running) {
    return { status: 'pending' };
  }
  if (/timed out|timeout/i.test(output)) {
    return { status: 'error', text: 'Timed out' };
  }
  if (/aborted|cancelled|canceled/i.test(output)) {
    return { status: 'error', text: 'Aborted' };
  }
  const match = output.match(/exit(?: code)?:?\s*(\d+)/i);
  // oxlint-disable-next-line unicorn/no-nested-ternary
  const exitCode = match ? Number(match[1]) : isError ? 1 : 0;
  return exitCode === 0
    ? { status: 'success' }
    : { status: 'error', text: `Exit code ${exitCode}` };
}
