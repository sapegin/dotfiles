/*
 * Minimal Pi extension to prettify built-in tool rendering inspired by Amp.
 */

// oxlint-disable unicorn/no-nested-ternary
import os from 'node:os';
import path from 'node:path';
import {
  type CodemodeToolDetails,
  type EditToolInput,
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
  type ToolRenderers,
  type WriteToolInput,
  SkillInvocationMessageComponent,
  UserMessageComponent,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getUsageCost(usage: unknown): number {
  if (!isRecord(usage) || !isRecord(usage.cost)) {
    return 0;
  }
  return typeof usage.cost.total === 'number' ? usage.cost.total : 0;
}

/** Sum usage cost from a single Pi session log entry. */
export function getEntryCost(entry: unknown): number {
  if (!isRecord(entry)) {
    return 0;
  }
  if (entry.type === 'message' && isRecord(entry.message)) {
    const message = entry.message;
    if (message.role === 'assistant' || message.role === 'toolResult') {
      return getUsageCost(message.usage);
    }
  }
  if (
    entry.type === 'branch_summary' ||
    entry.type === 'compaction' ||
    entry.type === 'usage'
  ) {
    return getUsageCost(entry.usage);
  }
  return 0;
}

function getSessionCost(ctx: ExtensionContext): number {
  return ctx.sessionManager
    .getEntries()
    .reduce((total, entry) => total + getEntryCost(entry), 0);
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

export default function pretty(pi: ExtensionAPI) {
  const codemodeRenderers = registerCodemode(pi);
  pi.registerToolRenderer((toolName, next) =>
    toolName === 'codemode'
      ? codemodeRenderers
      : (getPrettyToolRenderers(toolName) ?? next())
  );
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

/** Render a compact tool heading while its execution is pending. */
export function renderPrettyPendingTool({
  ctx,
  theme,
  name,
  value,
}: {
  ctx: {
    executionStarted: boolean;
    isPartial: boolean;
    lastComponent?: Component;
  };
  theme: Theme;
  name: string;
  value: string;
}): Component {
  const text = getTextComponent(ctx);
  text.setText(
    ctx.executionStarted && ctx.isPartial
      ? basicToolHeading(theme, toolTitle(theme, name, value), 'pending')
      : () => ''
  );
  return text;
}

/** Render a compact tool result with optional status, summary, and error. */
export function renderPrettyCompletedTool({
  ctx,
  error,
  extra,
  theme,
  name,
  status,
  value,
}: {
  ctx: {
    isError?: boolean;
    isPartial?: boolean;
    lastComponent?: Component;
  };
  error?: string;
  extra?: string;
  theme: Theme;
  name: string;
  status?: FrameStatus;
  value: string;
}): Component {
  const text = getTextComponent(ctx);
  text.setText(
    basicToolHeading(
      theme,
      toolTitle(theme, name, value),
      status ?? getFrameStatus(ctx),
      extra,
      error
    )
  );
  return text;
}

function getToolInput<T>(input: unknown): T {
  return input as T;
}

function formatReadError(message: string) {
  // ENOENT: no such file or directory, access '...'
  if (message.startsWith('ENOENT')) {
    return 'File not found';
  }
  return message;
}

interface PrettyToolSummary {
  name: string;
  value: string;
  status: FrameStatus;
  error?: string;
  count?: number;
  diff?: DiffStats;
}

interface PrettyNestedCall extends PrettyToolSummary {
  id: string;
}

/** Select the main argument shared by direct calls and codemode previews. */
function getPrettyToolField(
  name: string
): 'command' | 'pattern' | 'path' | undefined {
  switch (name) {
    case 'bash':
      return 'command';
    case 'grep':
    case 'find':
      return 'pattern';
    case 'read':
    case 'write':
    case 'edit':
    case 'ls':
      return 'path';
    default:
      return undefined;
  }
}

/** Extract theme-independent display data without retaining tool payloads. */
function getPrettyToolSummary(
  name: string,
  args: unknown,
  output: string | undefined,
  ctx: { isPartial?: boolean; isError?: boolean }
): PrettyToolSummary | undefined {
  const field = getPrettyToolField(name);
  if (!field) {
    return undefined;
  }
  const value = getToolInput<Record<string, unknown>>(args)[field];
  const summary: PrettyToolSummary = {
    name,
    value: typeof value === 'string' ? value : '',
    status: getFrameStatus(ctx),
  };
  if (output === undefined) {
    return summary;
  }
  if (name === 'bash') {
    const bash = bashSummary(output, ctx.isPartial ?? false, ctx.isError);
    summary.status = bash.status;
    summary.error = bash.text;
  } else if (ctx.isError) {
    summary.error = firstLine(
      name === 'read' ? formatReadError(output) : output
    ).slice(0, 500);
  } else if (name === 'edit') {
    summary.diff = getToolInput<EditToolInput>(args)
      .edits.map((edit) => getLineDiffStats(edit.oldText, edit.newText))
      .reduce(
        (total, diff) => ({
          added: total.added + diff.added,
          removed: total.removed + diff.removed,
        }),
        { added: 0, removed: 0 }
      );
  } else if (!ctx.isPartial) {
    if (['find', 'grep', 'ls'].includes(name)) {
      summary.count = countLines(output);
    } else if (name === 'write') {
      summary.diff = {
        added: countLines(getToolInput<WriteToolInput>(args).content),
        removed: 0,
      };
    }
  }
  return summary;
}

function formatBashCommand(command: string) {
  const highlighted = highlightCode(command, 'bash');
  return highlighted.join(' ↵ ');
}

/** Format the shared heading fields, including preview-only calls. */
function formatPrettyToolTitle(
  theme: Theme,
  toolName: string,
  value: string
): string {
  const name =
    toolName === 'ls'
      ? 'List'
      : toolName.charAt(0).toUpperCase() + toolName.slice(1);
  const field = getPrettyToolField(toolName);
  return toolTitle(
    theme,
    name,
    field === 'command'
      ? formatBashCommand(value)
      : field === 'path'
        ? tildify(value)
        : value
  );
}

/** Apply the active theme to the same compact data for direct and nested rows. */
function formatPrettyToolSummary(
  theme: Theme,
  summary: PrettyToolSummary
): WidthAwareTextFormatter {
  const extra =
    summary.count === undefined
      ? summary.diff
        ? summary.name === 'write'
          ? theme.fg('success', `+${summary.diff.added}`)
          : summarizeDiff(theme, summary.diff.added, summary.diff.removed)
        : undefined
      : theme.fg('dim', theme.italic(formatItemCount(summary.count)));
  return basicToolHeading(
    theme,
    formatPrettyToolTitle(theme, summary.name, summary.value),
    summary.status,
    extra,
    summary.error
  );
}

function getPrettyToolRenderers(toolName: string): ToolRenderers | undefined {
  if (!getPrettyToolField(toolName)) {
    return undefined;
  }
  return {
    renderShell: 'self',
    renderCall(args, theme, ctx) {
      const text = getTextComponent(ctx);
      const summary = getPrettyToolSummary(toolName, args, undefined, {
        isPartial: true,
      });
      text.setText(
        toolName !== 'bash' && ctx.executionStarted && ctx.isPartial && summary
          ? formatPrettyToolSummary(theme, summary)
          : () => ''
      );
      return text;
    },
    renderResult(result, _options, theme, ctx) {
      const output =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      const summary = getPrettyToolSummary(toolName, ctx.args, output, ctx);
      const text = getTextComponent(ctx);
      text.setText(
        summary ? formatPrettyToolSummary(theme, summary) : () => ''
      );
      return text;
    },
  };
}

/** Format a nested call preview, including JSON cut off inside its main field. */
function formatNestedToolTitle(
  theme: Theme,
  name: string,
  args: string
): string {
  const field = getPrettyToolField(name);
  if (!field) {
    return formatPrettyToolTitle(theme, name, args);
  }

  // Codemode cuts argument previews at 200 characters, so parsing the whole JSON
  // fails for long commands. Match the string field without requiring its closing quote.
  const match = args.match(
    new RegExp(String.raw`"${field}"\s*:\s*"((?:\\.|[^"\\])*)`)
  );
  let value = '';
  if (match) {
    try {
      value = JSON.parse(`"${match[1]}"`) as string;
    } catch {
      // A preview can end in the middle of a Unicode escape.
      value = match[1];
    }
  }
  return formatPrettyToolTitle(theme, name, value);
}

/** Keep only nested display summaries so compact rows survive session resume. */
function registerCodemode(pi: ExtensionAPI): ToolRenderers {
  const calls = new Map<string, PrettyNestedCall[]>();
  const streamingCalls = new WeakSet<PrettyNestedCall>();
  const invalidateParents = new Map<string, () => void>();
  pi.on('tool_execution_update', (event) => {
    if (!event.parentToolCallId || event.toolName !== 'bash') {
      return;
    }
    const call = calls
      .get(event.parentToolCallId)
      ?.find((nested) => nested.id === event.toolCallId);
    if (call) {
      streamingCalls.add(call);
      invalidateParents.get(event.parentToolCallId)?.();
    }
  });
  pi.on('tool_execution_start', (event) => {
    if (!event.parentToolCallId) {
      return;
    }
    const summary = getPrettyToolSummary(
      event.toolName,
      event.args,
      undefined,
      { isPartial: true }
    );
    if (!summary) {
      return;
    }
    const nested = calls.get(event.parentToolCallId) ?? [];
    nested.push({ id: event.toolCallId, ...summary });
    calls.set(event.parentToolCallId, nested);
    invalidateParents.get(event.parentToolCallId)?.();
  });
  pi.on('tool_result', (event) => {
    if (event.parentToolCallId) {
      const call = calls
        .get(event.parentToolCallId)
        ?.find((nested) => nested.id === event.toolCallId);
      if (call) {
        const output =
          event.content[0]?.type === 'text' ? event.content[0].text : '';
        const summary = getPrettyToolSummary(
          event.toolName,
          event.input,
          output,
          { isError: event.isError }
        );
        if (summary) {
          Object.assign(call, summary);
        }
      }
    } else {
      const prettyCalls = calls.get(event.toolCallId);
      calls.delete(event.toolCallId);
      invalidateParents.delete(event.toolCallId);
      if (event.toolName === 'codemode' && prettyCalls) {
        return {
          details: {
            ...(isRecord(event.details) ? event.details : {}),
            prettySummaries: prettyCalls,
          },
        };
      }
    }
  });
  pi.on('session_start', () => {
    calls.clear();
    invalidateParents.clear();
  });
  pi.on('session_shutdown', () => {
    calls.clear();
    invalidateParents.clear();
  });

  return {
    renderShell: 'self',
    renderCall() {
      return new Text('', 0, 0);
    },
    renderResult(result, _options, theme, ctx) {
      if (ctx.isPartial) {
        invalidateParents.set(ctx.toolCallId, ctx.invalidate);
        if (!calls.has(ctx.toolCallId)) {
          calls.set(ctx.toolCallId, []);
        }
      }
      const details = result.details as
        | (CodemodeToolDetails & { prettySummaries?: PrettyNestedCall[] })
        | undefined;
      const text = getTextComponent(ctx);
      const error = result.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');
      const scriptError = ctx.isError
        ? firstLine(error.split('Script error:').at(-1)?.trim() ?? '')
        : undefined;
      text.setText((width) => {
        const nested = details?.prettySummaries ?? calls.get(ctx.toolCallId);
        // An unhandled nested rejection adds "Error:" to the same message.
        const duplicateError =
          scriptError &&
          [
            ...(nested ?? []).filter((call) => call.status === 'error'),
            ...(details?.calls ?? []).filter(
              (call) => call.status === 'error' || call.status === 'cancelled'
            ),
          ].some(
            (call) =>
              call.error &&
              firstLine(call.error.trim()).replace(/^Error:\s*/, '') ===
                scriptError.replace(/^Error:\s*/, '')
          );
        const heading = basicToolHeading(
          theme,
          theme.fg('toolTitle', theme.bold('Codemode')),
          getFrameStatus(ctx),
          undefined,
          duplicateError ? undefined : scriptError
        );
        const rows = (nested ?? []).map((call) => {
          if (
            call.name === 'bash' &&
            call.status === 'pending' &&
            ctx.isPartial &&
            !streamingCalls.has(call)
          ) {
            return '';
          }
          const aborted = call.status === 'pending' && !ctx.isPartial;
          return formatPrettyToolSummary(
            theme,
            aborted
              ? {
                  ...call,
                  status: 'error',
                  error: call.name === 'bash' ? 'Aborted' : 'Command aborted',
                }
              : call
          )(width);
        });
        // Captured events own built-in rows; previews cover other tools and older logs.
        for (const call of details?.calls ?? []) {
          if (nested && getPrettyToolField(call.name)) {
            continue;
          }
          rows.push(
            basicToolHeading(
              theme,
              formatNestedToolTitle(theme, call.name, call.args),
              call.status === 'running'
                ? 'pending'
                : call.status === 'ok'
                  ? 'success'
                  : 'error',
              call.cost ? `$${call.cost.toFixed(2)}` : undefined,
              call.error
            )(width)
          );
        }
        return [heading(width), ...rows].filter(Boolean).join('\n');
      });
      return text;
    },
  };
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
