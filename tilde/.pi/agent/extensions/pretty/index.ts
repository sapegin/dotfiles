import fs from 'node:fs';
import path from 'node:path';
import {
  type EditToolDetails,
  type ExtensionAPI,
  type ReadToolDetails,
  type Theme,
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
} from '@earendil-works/pi-coding-agent';
import { Text } from '@earendil-works/pi-tui';
import {
  applyDiffPalette,
  canRenderSplit,
  lang as diffLang,
  parseDiff,
  renderSplit,
  resolveDiffColors,
  summarize as summarizeDiff,
  type DiffThemeLike,
  type ParsedDiff,
  hlBlock,
} from '@wierdbytes/pi-common/diff';
import {
  frameResult,
  frameResultWithBottomLabel,
  frameTop,
  getDefaultFrameWidth,
  getFrameStatus,
  type FrameStatus,
} from '@wierdbytes/pi-common/tool-frame';

const MAX_FRAME_WIDTH = 210;
const MAX_PREVIEW_LINES = 300;
const MAX_TOOL_OUTPUT_LINES = 3;
const oldContents = new Map<string, string>();

class AsyncText extends Text {
  private key = '';

  public setPending(
    key: string,
    fallback: string,
    render: () => Promise<string>,
    invalidate: () => void
  ): this {
    if (this.key === key) {
      return this;
    }
    this.key = key;
    this.setText(fallback);
    void this.renderPending(key, render, invalidate);
    return this;
  }

  private async renderPending(
    key: string,
    render: () => Promise<string>,
    invalidate: () => void
  ): Promise<void> {
    try {
      const text = await render();
      if (this.key !== key) {
        return;
      }
      this.setText(text);
      invalidate();
    } catch {
      // Keep the synchronous fallback. Rendering polish must not break tools.
    }
  }
}

export default function pretty(pi: ExtensionAPI) {
  applyDiffPalette();

  const cwd = process.cwd();
  registerRead(pi, cwd);
  registerBash(pi, cwd);
  registerLs(pi, cwd);
  registerFind(pi, cwd);
  registerGrep(pi, cwd);
  registerWrite(pi, cwd);
  registerEdit(pi, cwd);
}

function registerRead(pi: ExtensionAPI, cwd: string): void {
  const original = createReadTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'read', args.path),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, options, theme, ctx) {
      const w = frameWidth();
      const status = getFrameStatus(ctx);
      const content = result.content[0];
      if (content.type !== 'text') {
        return new Text(
          frameResult('image or binary content', status, theme, w),
          0,
          0
        );
      }

      const details = result.details as ReadToolDetails | undefined;
      const lineStart = Math.max(1, ctx.args.offset ?? 1);
      const plainLineCount = countLines(content.text);
      const hiddenLines = Math.max(0, plainLineCount - MAX_TOOL_OUTPUT_LINES);
      const statusLabel = details?.truncation?.truncated
        ? theme.fg('warning', 'truncated')
        : theme.fg('success', 'read');
      const label = bottomLabel(statusLabel, hiddenLines, theme);
      const component = (
        ctx.lastComponent instanceof AsyncText
          ? ctx.lastComponent
          : new AsyncText('', 0, 0)
      ) as AsyncText;
      const key = `read:${ctx.toolCallId}:${themeKey(theme)}:${w}:${options.expanded}`;
      return component.setPending(
        key,
        frameResultWithBottomLabel('highlighting…', label, status, theme, w),
        async () => {
          const body = await renderNumberedCode(
            truncateLines(content.text).body,
            ctx.args.path,
            lineStart,
            Math.max(20, w - 1),
            theme
          );
          return frameResultWithBottomLabel(body, label, status, theme, w);
        },
        ctx.invalidate
      );
    },
  });
}

function registerBash(pi: ExtensionAPI, cwd: string): void {
  const original = createBashTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'bash', singleLine(args.command)),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, options, theme, ctx) {
      const w = frameWidth();
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      const preview = truncateLines(content);
      const output = preview.body;
      const summary = bashSummary(content, options.isPartial, ctx.isError);
      const status = bashFrameStatus(summary.kind, options.isPartial);
      const label = bottomLabel(
        theme.fg(
          status === 'pending'
            ? 'warning'
            : // oxlint-disable-next-line unicorn/no-nested-ternary
              status === 'error'
              ? 'error'
              : 'success',
          summary.text
        ),
        preview.hiddenLines,
        theme
      );
      return new Text(
        frameResultWithBottomLabel(
          output || theme.fg('dim', 'no output'),
          label,
          status,
          theme,
          w
        ),
        0,
        0
      );
    },
  });
}

function registerLs(pi: ExtensionAPI, cwd: string): void {
  const original = createLsTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'ls', args.path ?? '.'),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, _options, theme, ctx) {
      const text =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      return new Text(
        framePreviewResult(
          renderTreeList(text, theme),
          getFrameStatus(ctx),
          theme
        ),
        0,
        0
      );
    },
  });
}

function registerFind(pi: ExtensionAPI, cwd: string): void {
  const original = createFindTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'find', args.pattern),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, _options, theme, ctx) {
      const text =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      return new Text(
        framePreviewResult(groupPaths(text, theme), getFrameStatus(ctx), theme),
        0,
        0
      );
    },
  });
}

function registerGrep(pi: ExtensionAPI, cwd: string): void {
  const original = createGrepTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'grep', args.pattern),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, _options, theme, ctx) {
      const text =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      return new Text(
        framePreviewResult(
          renderGrep(text, ctx.args.pattern, theme),
          getFrameStatus(ctx),
          theme
        ),
        0,
        0
      );
    },
  });
}

function registerWrite(pi: ExtensionAPI, cwd: string): void {
  const original = createWriteTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      oldContents.set(toolCallId, readExisting(cwd, params.path));
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      return new Text(
        frameTop(
          toolTitle(theme, 'write', args.path),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(_result, _options, theme, ctx) {
      const oldText = oldContents.get(ctx.toolCallId) ?? '';
      return renderDiffs(
        [{ title: ctx.args.path, oldText, newText: ctx.args.content }],
        theme,
        ctx
      );
    },
  });
}

function registerEdit(pi: ExtensionAPI, cwd: string): void {
  const original = createEditTool(cwd);
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate) {
      oldContents.set(toolCallId, readExisting(cwd, params.path));
      return original.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme, ctx) {
      const title = `${args.path}\n${args.edits.map((_, index) => theme.fg('accent', `Edit ${index + 1}`)).join('\n')}`;
      return new Text(
        frameTop(
          toolTitle(theme, 'edit', title),
          getFrameStatus(ctx),
          theme,
          frameWidth()
        ),
        0,
        0
      );
    },
    renderResult(result, _options, theme, ctx) {
      const details = result.details as EditToolDetails | undefined;
      const oldText = oldContents.get(ctx.toolCallId) ?? '';
      const newText = readExisting(cwd, ctx.args.path);
      const diffs =
        ctx.args.edits.length > 1
          ? ctx.args.edits.map((edit, index) => ({
              title: `Edit ${index + 1}`,
              oldText: edit.oldText,
              newText: edit.newText,
            }))
          : [{ title: ctx.args.path, oldText, newText }];
      const rendered = renderDiffs(diffs, theme, ctx);
      if (!details?.diff) {
        return rendered;
      }
      return rendered;
    },
  });
}

function renderDiffs(
  entries: { title: string; oldText: string; newText: string }[],
  theme: Theme,
  ctx: any
): Text {
  const w = frameWidth();
  const status = getFrameStatus(ctx);
  const innerWidth = Math.max(40, w - 1);
  const parsed = entries.map((entry) => ({
    ...entry,
    diff: parseDiff(entry.oldText, entry.newText),
  }));
  const label = summarizeAll(
    parsed.map((entry) => entry.diff),
    theme
  );
  const component = (
    ctx.lastComponent instanceof AsyncText
      ? ctx.lastComponent
      : new AsyncText('', 0, 0)
  ) as AsyncText;
  const key = `diff:${ctx.toolCallId}:${themeKey(theme)}:${w}:${parsed.map((entry) => `${entry.diff.added}/${entry.diff.removed}/${entry.diff.chars}`).join('|')}`;
  return component.setPending(
    key,
    frameResultWithBottomLabel('rendering diff…', label, status, theme, w),
    async () => {
      const layout = parsed.every((entry) =>
        canRenderSplit(entry.diff, innerWidth, MAX_PREVIEW_LINES)
      )
        ? 'split'
        : 'unified';
      const colors = resolveDiffColors(theme as unknown as DiffThemeLike);
      const chunks = await Promise.all(
        parsed.map(async (entry) => {
          const body = await renderSplit(
            entry.diff,
            diffLang(entry.title),
            MAX_PREVIEW_LINES,
            colors,
            innerWidth,
            {
              frameless: true,
              layout,
            }
          );
          return `${theme.fg('muted', entry.title)}\n${body}`;
        })
      );
      return frameResultWithBottomLabel(
        chunks.join('\n'),
        label,
        status,
        theme,
        w
      );
    },
    ctx.invalidate
  );
}

function truncateLines(text: string): { body: string; hiddenLines: number } {
  const lines = text.replace(/\n$/, '').split('\n');
  return {
    body: lines.slice(0, MAX_TOOL_OUTPUT_LINES).join('\n'),
    hiddenLines: Math.max(0, lines.length - MAX_TOOL_OUTPUT_LINES),
  };
}

function countLines(text: string): number {
  return text.replace(/\n$/, '').split('\n').length;
}

function bottomLabel(
  statusLabel: string,
  hiddenLines: number,
  theme: Theme
): string {
  return hiddenLines > 0
    ? theme.fg('muted', `${hiddenLines} lines more`)
    : statusLabel;
}

function framePreviewResult(
  body: string,
  status: FrameStatus,
  theme: Theme
): string {
  const preview = truncateLines(body);
  if (preview.hiddenLines === 0) {
    return frameResult(preview.body, status, theme, frameWidth());
  }
  return frameResultWithBottomLabel(
    preview.body,
    theme.fg('muted', `${preview.hiddenLines} lines more`),
    status,
    theme,
    frameWidth()
  );
}

function singleLine(text: string): string {
  return text.replaceAll(/\s*\n\s*/g, ' ↵ ');
}

async function renderNumberedCode(
  text: string,
  filepath: string,
  startLine: number,
  width: number,
  theme: any
): Promise<string> {
  const plainLines = text.replace(/\n$/, '').split('\n');
  const highlighted = await hlBlock(plainLines.join('\n'), diffLang(filepath));
  const lineNumberWidth = String(startLine + plainLines.length - 1).length;
  return highlighted
    .map((line, index) => {
      const number = theme.fg(
        'dim',
        String(startLine + index).padStart(lineNumberWidth)
      );
      return `${number} ${theme.fg('muted', '│')} ${line}`;
    })
    .join('\n');
}

function renderTreeList(text: string, theme: any): string {
  const lines = usefulLines(text);
  return lines
    .map((line, index) => {
      const trimmed = line.trim();
      const last = index === lines.length - 1;
      return `${theme.fg('muted', last ? '╰─' : '├─')} ${fileIcon(trimmed)} ${trimmed}`;
    })
    .join('\n');
}

function groupPaths(text: string, theme: any): string {
  const groups = new Map<string, string[]>();
  for (const line of usefulLines(text)) {
    const slash = line.lastIndexOf('/');
    const dir = slash === -1 ? '.' : line.slice(0, slash) || '.';
    const file = slash === -1 ? line : line.slice(slash + 1);
    groups.set(dir, [...(groups.get(dir) ?? []), file]);
  }
  return [...groups.entries()]
    .map(([dir, files]) => {
      const rows = files.map(
        (file, index) =>
          `${theme.fg('muted', index === files.length - 1 ? '  ╰─' : '  ├─')} ${fileIcon(file)} ${file}`
      );
      return [theme.fg('accent', dir), ...rows].join('\n');
    })
    .join('\n');
}

function renderGrep(text: string, pattern: string, theme: any): string {
  const byFile = new Map<string, string[]>();
  for (const line of usefulLines(text)) {
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    if (!match) {
      byFile.set('', [...(byFile.get('') ?? []), line]);
      continue;
    }
    const [, file, lineNumber, body] = match;
    byFile.set(file, [
      ...(byFile.get(file) ?? []),
      `${theme.fg('dim', lineNumber.padStart(4))} ${theme.fg('muted', '│')} ${highlight(body, pattern, theme)}`,
    ]);
  }
  return [...byFile.entries()]
    .map(([file, rows]) =>
      file
        ? `${theme.fg('accent', `${fileIcon(file)} ${file}`)}\n${rows.join('\n')}`
        : rows.join('\n')
    )
    .join('\n');
}

function usefulLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !/^\[.*truncated/i.test(line));
}

function highlight(text: string, needle: string, theme: any): string {
  if (!needle) {
    return text;
  }
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) {
    return text;
  }
  return `${text.slice(0, index)}${theme.fg('warning', text.slice(index, index + needle.length))}${text.slice(index + needle.length)}`;
}

function bashSummary(
  output: string,
  running: boolean,
  isError?: boolean
): { kind: 'ok' | 'error' | 'running'; text: string } {
  if (running) {
    return { kind: 'running', text: '… running' };
  }
  if (/timed out|timeout/i.test(output)) {
    return { kind: 'error', text: '✗ timed out' };
  }
  if (/aborted|cancelled|canceled/i.test(output)) {
    return { kind: 'error', text: '✗ aborted' };
  }
  const match = output.match(/exit(?: code)?:?\s*(\d+)/i);
  // oxlint-disable-next-line unicorn/no-nested-ternary
  const exitCode = match ? Number(match[1]) : isError ? 1 : 0;
  return exitCode === 0
    ? { kind: 'ok', text: '✓ exit 0' }
    : { kind: 'error', text: `✗ exit ${exitCode}` };
}

function bashFrameStatus(
  kind: 'ok' | 'error' | 'running',
  running: boolean
): FrameStatus {
  if (running || kind === 'running') {
    return 'pending';
  }
  return kind === 'error' ? 'error' : 'success';
}

function summarizeAll(diffs: ParsedDiff[], theme: any): string {
  const added = diffs.reduce((total, diff) => total + diff.added, 0);
  const removed = diffs.reduce((total, diff) => total + diff.removed, 0);
  return theme.fg('success', summarizeDiff(added, removed));
}

function toolTitle(theme: any, name: string, value: string): string {
  return `${theme.fg('toolTitle', theme.bold(name))} ${theme.fg('accent', value)}`;
}

function frameWidth(): number {
  return getDefaultFrameWidth(MAX_FRAME_WIDTH);
}

function readExisting(cwd: string, filepath: string): string {
  const absolutePath = path.resolve(cwd, filepath);
  try {
    return fs.existsSync(absolutePath)
      ? fs.readFileSync(absolutePath, 'utf8')
      : '';
  } catch {
    return '';
  }
}

function fileIcon(filepath: string): string {
  if (filepath.endsWith('/')) {
    return '';
  }
  switch (path.extname(filepath).slice(1).toLowerCase()) {
    case 'ts':
    case 'tsx':
      return '';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return '';
    case 'json':
      return '';
    case 'md':
    case 'mdx':
      return '';
    case 'css':
    case 'scss':
      return '';
    case 'html':
      return '';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return '';
    default:
      return '';
  }
}

function themeKey(theme: any): string {
  return ['success', 'warning', 'error', 'accent', 'muted']
    .map((key) => theme.fg(key, key))
    .join('|');
}
