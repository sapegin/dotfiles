// oxlint-disable unicorn/no-nested-ternary
import os from 'node:os';
import {
  type ExtensionAPI,
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
import { truncateToWidth, Text, type Component } from '@earendil-works/pi-tui';
import * as Diff from 'diff';

/** Diff summary stats. */
export interface DiffStats {
  added: number;
  removed: number;
}

/** Visual status of a tool execution, used to color the frame chrome. */
export type FrameStatus = 'pending' | 'success' | 'error';

function tildify(filepath: string) {
  return filepath.replace(os.homedir(), '~');
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

/**
 * Returns added/removed lines stats for a diff.
 */
function getDiffStats(oldContent: string, newContent: string): DiffStats {
  const patch = Diff.structuredPatch('', '', oldContent, newContent, '', '');
  let added = 0;
  let removed = 0;
  for (const hunk of patch.hunks) {
    for (const raw of hunk.lines) {
      const character = raw[0];
      if (character === '+') {
        added++;
      } else if (character === '-') {
        removed++;
      }
    }
  }
  return {
    added,
    removed,
  };
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
        getDiffStats(edit.oldText, edit.newText)
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
