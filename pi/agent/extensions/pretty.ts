/*
 * Minimal Pi extension to prettify built-in tool rendering inspired by Amp.
 */

// oxlint-disable unicorn/no-nested-ternary
import os from 'node:os';
import path from 'node:path';
import {
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
  SkillInvocationMessageComponent,
  UserMessageComponent,
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  generateDiffString,
  highlightCode,
} from '@earendil-works/pi-coding-agent';
import {
  truncateToWidth,
  Text,
  type Component,
  visibleWidth,
} from '@earendil-works/pi-tui';

export interface DiffStats {
  added: number;
  removed: number;
}

export function getLineDiffStats(
  oldContent: string,
  newContent: string
): DiffStats {
  const lines = generateDiffString(oldContent, newContent, 0).diff.split('\n');
  return {
    added: lines.filter((line) => line.startsWith('+')).length,
    removed: lines.filter((line) => line.startsWith('-')).length,
  };
}

export type FrameStatus = 'pending' | 'success' | 'error';

function tildify(filepath: string): string {
  const homeDirectory = os.homedir();
  if (filepath === homeDirectory) {
    return '~';
  }
  return filepath.startsWith(`${homeDirectory}${path.sep}`)
    ? `~${filepath.slice(homeDirectory.length)}`
    : filepath;
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
  const rightWidth = visibleWidth(right);
  if (rightWidth >= width) {
    return truncateToWidth(right, width);
  }

  const maxLeftWidth = width - rightWidth - 1;
  const leftToDisplay = truncateToWidth(left, maxLeftWidth, '…');
  const padding = width - visibleWidth(leftToDisplay) - rightWidth;
  return `${leftToDisplay}${' '.repeat(padding)}${right}`;
}

type ToolSet = ReturnType<typeof createToolSet>;

const toolSets = new Map<string, ToolSet>();

function createToolSet(cwd: string) {
  return {
    bash: createBashToolDefinition(cwd),
    edit: createEditToolDefinition(cwd),
    find: createFindToolDefinition(cwd),
    grep: createGrepToolDefinition(cwd),
    ls: createLsToolDefinition(cwd),
    read: createReadToolDefinition(cwd),
    write: createWriteToolDefinition(cwd),
  };
}

function getToolSet(cwd: string): ToolSet {
  const cached = toolSets.get(cwd);
  if (cached) {
    return cached;
  }

  const tools = createToolSet(cwd);
  toolSets.set(cwd, tools);
  return tools;
}

function getSessionCost(ctx: ExtensionContext): number {
  return ctx.sessionManager.getEntries().reduce((total, entry) => {
    if (entry.type === 'message' && entry.message.role === 'assistant') {
      return total + entry.message.usage.cost.total;
    }
    if (entry.type === 'message' && entry.message.role === 'toolResult') {
      return total + (entry.message.usage?.cost.total ?? 0);
    }
    if (entry.type === 'branch_summary' || entry.type === 'compaction') {
      return total + (entry.usage?.cost.total ?? 0);
    }
    return total;
  }, 0);
}

function formatContextUsageLabel(ctx: ExtensionContext): {
  label: string;
  percent: number | null;
} {
  const contextUsage = ctx.getContextUsage();
  const contextWindow =
    contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
  const contextPercent = contextUsage?.percent ?? null;
  const windowLabel = formatContextWindowTokens(contextWindow);

  if (contextPercent === null) {
    return { label: `?/${windowLabel}`, percent: null };
  }

  return {
    label: `${Math.round(contextPercent)}%/${windowLabel}`,
    percent: contextPercent,
  };
}

export function renderPrettyFooter(
  ctx: ExtensionContext,
  pi: ExtensionAPI,
  theme: Theme,
  width: number
): string[] {
  const cwd = tildify(ctx.sessionManager.getCwd());

  const modelName = ctx.model?.name ?? ctx.model?.id ?? 'no-model';
  const thinkingLevel = pi.getThinkingLevel();
  const modelText = ctx.model?.reasoning
    ? thinkingLevel === 'off'
      ? `${modelName} (thinking off)`
      : `${modelName} (${thinkingLevel})`
    : modelName;

  const totalCost = getSessionCost(ctx);
  const { label: contextLabel, percent: contextPercent } =
    formatContextUsageLabel(ctx);
  const costText = `$${totalCost.toFixed(2)}`;

  const statsText =
    (contextPercent ?? 0) > 90
      ? theme.fg('error', contextLabel)
      : (contextPercent ?? 0) > 70
        ? theme.fg('warning', contextLabel)
        : contextLabel;

  const rightText = `${costText} • ${statsText} • ${modelText}`;

  return [
    rightPadLine(theme.fg('dim', cwd), theme.fg('dim', rightText), width),
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
    ctx.ui.setFooter((tui, theme) => {
      requestRender = () => {
        tui.requestRender();
      };

      return {
        dispose() {
          requestRender = undefined;
          activeCtx = undefined;
        },
        invalidate() {},
        render(width: number): string[] {
          if (activeCtx === undefined) {
            return [];
          }

          return renderPrettyFooter(activeCtx, pi, theme, width);
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

interface PatchableUserMessage {
  text: string;
  render(width: number): string[];
}

type PatchableUserMessagePrototype = PatchableUserMessage & {
  piPrettyOriginalRender?: (
    this: PatchableUserMessage,
    width: number
  ) => string[];
};

export function formatUserPrompt(
  theme: Theme,
  text: string,
  width: number
): string {
  const singleLine = text.replaceAll(/\s+/g, ' ').trim();
  if (singleLine === '') {
    return '';
  }

  return truncateToWidth(
    theme.fg('dim', theme.italic(` ${singleLine}`)),
    width,
    theme.fg('dim', theme.italic('…'))
  );
}

// Pi has no user-message renderer hook, so patch the built-in component and restore it on shutdown.
function registerUserPrompt(pi: ExtensionAPI): void {
  const prototype =
    UserMessageComponent.prototype as unknown as PatchableUserMessagePrototype;
  // oxlint-disable-next-line typescript/unbound-method -- Rebound explicitly with Function.call.
  const originalRender = prototype.piPrettyOriginalRender ?? prototype.render;
  let activeTheme: Theme | undefined;

  const renderUserPrompt = function (
    this: PatchableUserMessage,
    width: number
  ): string[] {
    if (!activeTheme) {
      return originalRender.call(this, width);
    }

    const prompt = formatUserPrompt(activeTheme, this.text, width);
    return prompt === '' ? [] : [prompt];
  };

  prototype.piPrettyOriginalRender = originalRender;
  prototype.render = renderUserPrompt;

  pi.on('session_start', (_event, ctx) => {
    activeTheme = ctx.ui.theme;
  });

  pi.on('session_shutdown', () => {
    activeTheme = undefined;
    if (prototype.render === renderUserPrompt) {
      prototype.render = originalRender;
      delete prototype.piPrettyOriginalRender;
    }
  });
}

type WidthAwareTextFormatter = (width: number) => string;

class WidthAwareText implements Component {
  private formatter: WidthAwareTextFormatter = () => '';

  public setText(formatter: WidthAwareTextFormatter): void {
    this.formatter = formatter;
  }

  public render(width: number): string[] {
    const text = this.formatter(width);
    return text === '' ? [] : text.split('\n');
  }

  public invalidate(): void {}
}

function getTextComponent(ctx: { lastComponent?: Component }): WidthAwareText {
  return (
    (ctx.lastComponent as WidthAwareText | undefined) ?? new WidthAwareText()
  );
}

const TURN_SEPARATOR_ENTRY = 'pretty-turn-separator';

function formatTurnSeparator(width: number): string {
  const marker = ' 8< ──────── 8< ';
  const ruleWidth = width - marker.length;
  const leftWidth = Math.floor(ruleWidth / 2);
  const rightWidth = ruleWidth - leftWidth;
  return `${'─'.repeat(leftWidth)}${marker}${'─'.repeat(rightWidth)}`;
}

function registerTurnSeparator(pi: ExtensionAPI): void {
  pi.registerEntryRenderer(TURN_SEPARATOR_ENTRY, (_entry, _options, theme) => {
    const separator = new WidthAwareText();
    separator.setText((width) => theme.fg('dim', formatTurnSeparator(width)));
    return separator;
  });

  pi.on('before_agent_start', (_event, ctx) => {
    const hasPreviousTurn = ctx.sessionManager
      .getBranch()
      .some(
        (entry) =>
          entry.type === 'message' && entry.message.role === 'assistant'
      );
    if (hasPreviousTurn) {
      pi.appendEntry(TURN_SEPARATOR_ENTRY);
    }
  });
}

function toolIcon(theme: Theme, status: FrameStatus): string {
  if (status === 'error') {
    return theme.fg('error', '✕');
  } else if (status === 'success') {
    return theme.fg('success', '✓');
  } else {
    return theme.fg('muted', '∙');
  }
}

function toolTitle(theme: Theme, name: string, value: string): string {
  return `${theme.fg('toolTitle', theme.bold(name))} ${theme.fg('muted', value)}`;
}

interface PatchableSkillInvocation {
  skillBlock: { name: string };
  render(width: number): string[];
}

type PatchableSkillInvocationPrototype = PatchableSkillInvocation & {
  piPrettyOriginalRender?: (
    this: PatchableSkillInvocation,
    width: number
  ) => string[];
};

function formatSkillInvocation(
  theme: Theme,
  name: string,
  width: number
): string {
  const heading = ` ${toolIcon(theme, 'success')} ${toolTitle(theme, 'Skill', name)}`;
  return truncateToWidth(heading, width, '…');
}

// Pi has no skill-invocation renderer hook, so patch the built-in component and
// restore it on shutdown.
function registerSkillInvocation(pi: ExtensionAPI): void {
  const prototype =
    SkillInvocationMessageComponent.prototype as unknown as PatchableSkillInvocationPrototype;
  // oxlint-disable-next-line typescript/unbound-method -- Rebound explicitly with Function.call.
  const originalRender = prototype.piPrettyOriginalRender ?? prototype.render;
  let activeTheme: Theme | undefined;

  const renderSkillInvocation = function (
    this: PatchableSkillInvocation,
    width: number
  ): string[] {
    if (!activeTheme) {
      return originalRender.call(this, width);
    }

    return [formatSkillInvocation(activeTheme, this.skillBlock.name, width)];
  };

  prototype.piPrettyOriginalRender = originalRender;
  prototype.render = renderSkillInvocation;

  pi.on('session_start', (_event, ctx) => {
    activeTheme = ctx.ui.theme;
  });

  pi.on('session_shutdown', () => {
    if (prototype.render === renderSkillInvocation) {
      prototype.render = originalRender;
      delete prototype.piPrettyOriginalRender;
    }
  });
}

function firstLine(text: string): string {
  return text.replace(/\n$/, '').split('\n')[0];
}

export function countLines(text: string): number {
  if (text === '') {
    return 0;
  }

  return text.replace(/\n$/, '').split('\n').length;
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function formatError(theme: Theme, message: string, width: number): string {
  const truncatedMessage = truncateToWidth(
    firstLine(message),
    Math.max(0, width - 4),
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

export default function pretty(pi: ExtensionAPI) {
  const cwd = process.cwd();
  registerRead(pi, cwd);
  registerFind(pi, cwd);
  registerGrep(pi, cwd);
  registerBash(pi, cwd);
  registerLs(pi, cwd);
  registerWrite(pi, cwd);
  registerEdit(pi, cwd);
  registerSkillInvocation(pi);
  registerUserPrompt(pi);
  registerTurnSeparator(pi);
  registerFooter(pi);
}

function basicToolHeading(
  theme: Theme,
  titleAnsi: string,
  status: FrameStatus,
  extra?: string,
  error?: string
): WidthAwareTextFormatter {
  return (width) => {
    const extraWidth = extra ? visibleWidth(extra) + 1 : 0;
    const maxTitleWidth = Math.max(0, width - extraWidth - 4);
    const titleToDisplay = truncateToWidth(titleAnsi, maxTitleWidth, '…');
    const heading = [toolIcon(theme, status), titleToDisplay, extra]
      .filter(Boolean)
      .join(' ');
    return [` ${heading}`, error ? formatError(theme, error, width) : undefined]
      .filter(Boolean)
      .join('\n');
  };
}

function renderPendingToolCall({
  ctx,
  theme,
  title,
}: {
  ctx: {
    executionStarted: boolean;
    isPartial: boolean;
    lastComponent?: Component;
  };
  theme: Theme;
  title: () => string;
}): WidthAwareText {
  const text = getTextComponent(ctx);
  text.setText(
    ctx.executionStarted && ctx.isPartial
      ? basicToolHeading(theme, title(), 'pending')
      : () => ''
  );
  return text;
}

function formatReadError(message: string) {
  // ENOENT: no such file or directory, access '...'
  if (message.startsWith('ENOENT')) {
    return 'File not found';
  }
  return message;
}

function registerRead(pi: ExtensionAPI, cwd: string): void {
  const original = getToolSet(cwd).read;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).read.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'Read', tildify(args.path)),
      });
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
  const original = getToolSet(cwd).find;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).find.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'Find', args.pattern),
      });
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
          ctx.isPartial || ctx.isError
            ? undefined
            : theme.fg(
                'dim',
                theme.italic(formatItemCount(countLines(content)))
              ),
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
}

function registerGrep(pi: ExtensionAPI, cwd: string): void {
  const original = getToolSet(cwd).grep;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).grep.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'Grep', args.pattern),
      });
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
          ctx.isPartial || ctx.isError
            ? undefined
            : theme.fg(
                'dim',
                theme.italic(formatItemCount(countLines(content)))
              ),
          ctx.isError ? content : undefined
        )
      );

      return text;
    },
  });
}

function registerLs(pi: ExtensionAPI, cwd: string): void {
  const original = getToolSet(cwd).ls;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).ls.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'List', tildify(args.path ?? '')),
      });
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
          ctx.isPartial || ctx.isError
            ? undefined
            : theme.fg(
                'dim',
                theme.italic(formatItemCount(countLines(content)))
              ),
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
  const original = getToolSet(cwd).bash;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).bash.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
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
  const original = getToolSet(cwd).write;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).write.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'Write', tildify(args.path)),
      });
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
          ctx.isPartial || ctx.isError
            ? undefined
            : theme.fg('success', `+${countLines(content)}`),
          ctx.isError ? output : undefined
        )
      );

      return text;
    },
  });
}

function registerEdit(pi: ExtensionAPI, cwd: string): void {
  const original = getToolSet(cwd).edit;
  pi.registerTool({
    ...original,
    renderShell: 'self',
    execute(toolCallId, params, signal, onUpdate, ctx) {
      return getToolSet(ctx.cwd).edit.execute(
        toolCallId,
        params,
        signal,
        onUpdate,
        ctx
      );
    },
    renderCall(args, theme, ctx) {
      return renderPendingToolCall({
        ctx,
        theme,
        title: () => toolTitle(theme, 'Edit', tildify(args.path)),
      });
    },
    renderResult(result, _options, theme, ctx) {
      const text = getTextComponent(ctx);

      const filepath = ctx.args.path;
      const summary = ctx.isError
        ? undefined
        : summarizeAll(
            theme,
            ctx.args.edits.map((edit) =>
              getLineDiffStats(edit.oldText, edit.newText)
            )
          );
      const error =
        result.content[0]?.type === 'text' ? result.content[0].text : undefined;

      text.setText(
        basicToolHeading(
          theme,
          toolTitle(theme, 'Edit', tildify(filepath)),
          getFrameStatus(ctx),
          summary,
          ctx.isError ? error : undefined
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
  if (running && !isError) {
    return { status: 'pending' };
  }
  if (!isError) {
    return { status: 'success' };
  }

  const statusLine = output.trimEnd().split('\n').at(-1) ?? '';
  if (/^Command timed out after \d+ seconds$/i.test(statusLine)) {
    return { status: 'error', text: 'Timed out' };
  }
  if (/^Command aborted$/i.test(statusLine)) {
    return { status: 'error', text: 'Aborted' };
  }

  const exitMatch = statusLine.match(/^Command exited with code (\d+)$/i);
  return {
    status: 'error',
    text: exitMatch ? `Exit code ${exitMatch[1]}` : 'Failed',
  };
}
