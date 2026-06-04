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
} from '@earendil-works/pi-coding-agent';
import { truncateToWidth, Text } from '@earendil-works/pi-tui';
import * as Diff from 'diff';

/** A single diff line (context / addition / deletion / hunk separator). */
export interface DiffLine {
  type: 'ctx' | 'add' | 'del' | 'sep';
  oldNum: number | null;
  newNum: number | null;
}

/** Parsed diff with line list + summary stats. */
export interface ParsedDiff {
  lines: DiffLine[];
  added: number;
  removed: number;
}

/** Visual status of a tool execution, used to colour the frame chrome. */
export type FrameStatus = 'pending' | 'success' | 'error';

function tildify(filepath: string) {
  return filepath.replace(os.homedir(), '~');
}

function toolIcon(theme: any, status: FrameStatus): string {
  if (status === 'error') {
    return theme.fg('error', '✕');
  } else if (status === 'success') {
    return theme.fg('success', '✓');
  } else {
    return theme.fg('muted', '…');
  }
}

function toolTitle(theme: any, name: string, value: string): string {
  return `${theme.fg('toolTitle', theme.bold(name))} ${theme.fg('accent', value)}`;
}

function frameWidth(): number {
  return process.stdout.columns;
}

function firstLine(text: string): string {
  return text.replace(/\n$/, '').split('\n')[0];
}

function singleLine(text: string): string {
  return text.replaceAll(/\s*\n\s*/g, ' ↵ ');
}

function countLines(text: string): number {
  return text.replace(/\n$/, '').split('\n').length;
}

function formatError(theme: any, message: string): string {
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
 * Parse two text blobs into a diff-line list using `diff` package's
 * `structuredPatch`. Hunk separators are emitted as `{ type: "sep" }`
 * with `newNum` carrying the gap line count.
 */
function parseDiff(
  oldContent: string,
  newContent: string,
  ctx = 3
): ParsedDiff {
  const patch = Diff.structuredPatch('', '', oldContent, newContent, '', '', {
    context: ctx,
  });
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  for (let hi = 0; hi < patch.hunks.length; hi++) {
    if (hi > 0) {
      const prev = patch.hunks[hi - 1];
      const gap = patch.hunks[hi].oldStart - (prev.oldStart + prev.oldLines);
      lines.push({
        type: 'sep',
        oldNum: null,
        newNum: gap > 0 ? gap : null,
      });
    }
    const h = patch.hunks[hi];
    let oL = h.oldStart;
    let nL = h.newStart;
    for (const raw of h.lines) {
      if (raw === '\\ No newline at end of file') {
        continue;
      }
      const ch = raw[0];
      if (ch === '+') {
        lines.push({ type: 'add', oldNum: null, newNum: nL++ });
        added++;
      } else if (ch === '-') {
        lines.push({ type: 'del', oldNum: oL++, newNum: null });
        removed++;
      } else {
        lines.push({ type: 'ctx', oldNum: oL++, newNum: nL++ });
      }
    }
  }
  return {
    lines,
    added,
    removed,
  };
}

/** Compact `+N -M` summary string with diff fg colors. */
function summarizeDiff(theme: any, added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) {
    parts.push(theme.fg('success', `+${added}`));
  }
  if (removed > 0) {
    parts.push(theme.fg('error', `−${removed}`));
  }
  return parts.length > 0 ? parts.join(' ') : theme.fg('dim', 'no changes');
}

function summarizeAll(theme: any, diffs: ParsedDiff[]): string {
  const added = diffs.reduce((total, diff) => total + diff.added, 0);
  const removed = diffs.reduce((total, diff) => total + diff.removed, 0);
  return summarizeDiff(theme, added, removed);
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
}

function basicToolHeading(
  titleAnsi: string,
  status: FrameStatus,
  // TODO: Move to the first argument
  theme: Theme,
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
        extra ? theme.fg('dim', extra) : undefined,
      ]
        .filter(Boolean)
        .join(' '),
    error ? formatError(theme, error) : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

// TODO: Handle not found error nicely:
// ENOENT: no such file or directory, access '/Users/sapegia/.pi/settings.json'

function registerRead(pi: ExtensionAPI, cwd: string): void {
  const original = createReadTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const filepath = ctx.args.path;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          toolTitle(
            theme,
            ctx.isPartial ? 'Reading' : 'Read',
            tildify(filepath)
          ),
          getFrameStatus(ctx),
          theme,
          undefined,
          ctx.isError ? content : undefined
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
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const pattern = ctx.args.pattern;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          toolTitle(theme, ctx.isPartial ? 'Finding' : 'Find', pattern),
          getFrameStatus(ctx),
          theme,
          ctx.isPartial ? undefined : `(${countLines(content)} items)`,
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
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const pattern = ctx.args.pattern;
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          toolTitle(theme, ctx.isPartial ? 'Grepping' : 'Grep', pattern),
          getFrameStatus(ctx),
          theme,
          ctx.isPartial ? undefined : `(${countLines(content)} items)`,
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
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const root = tildify(ctx.args.path ?? '');
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';

      text.setText(
        basicToolHeading(
          toolTitle(theme, ctx.isPartial ? 'Listing' : 'List', root),
          getFrameStatus(ctx),
          theme,
          ctx.isPartial ? undefined : `(${countLines(content)} items)`,
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
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
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const command = singleLine(ctx.args.command);
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      const summary = bashSummary(content, ctx.isPartial, ctx.isError);

      text.setText(
        basicToolHeading(
          toolTitle(theme, ctx.isPartial ? 'Bashing' : 'Bash', command),
          summary.status,
          theme,
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
      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const filepath = ctx.args.path;
      const content = ctx.args.content;

      text.setText(
        basicToolHeading(
          toolTitle(
            theme,
            ctx.isPartial ? 'Writing' : `Write`,
            tildify(filepath)
          ),
          getFrameStatus(ctx),
          theme,
          ctx.isPartial ? `(${content.split('\n').length} lines)` : undefined,
          result.details.error
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
      // const details = result.details as EditToolDetails | undefined;

      const text =
        (ctx.lastComponent as Text | undefined) ?? new Text('', 0, 0);

      const filepath = ctx.args.path;

      const diffs = ctx.args.edits.map((edit) =>
        parseDiff(edit.oldText, edit.newText)
      );
      const summary = summarizeAll(theme, diffs);

      text.setText(
        basicToolHeading(
          toolTitle(
            theme,
            ctx.isError
              ? // TODO: Test error reporting
                `${filepath}\n${formatError(theme, result.details.error)}`
              : ctx.isPartial
                ? 'Editing'
                : 'Edit',
            tildify(filepath)
          ),
          getFrameStatus(ctx),
          theme,
          // Number of edit while the file is still editing
          ctx.isPartial ? `Edit ${ctx.args.edits.length}` : summary
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
