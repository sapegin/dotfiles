import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import {
  type ExtensionAPI,
  type ExtensionContext,
  SkillInvocationMessageComponent,
  type Theme,
  UserMessageComponent,
} from '@earendil-works/pi-coding-agent';
import { describe, expect, test } from 'vitest';
import pretty, {
  countLines,
  formatUserPrompt,
  getLineDiffStats,
  renderPrettyFooter,
} from './pretty.ts';

const plainTheme = {
  bold: (text: string) => text,
  fg: (_color: string, text: string) => text,
  italic: (text: string) => text,
} as Theme;

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown;
type EntryRenderer = (
  entry: unknown,
  options: unknown,
  theme: Theme
) => { render(width: number): string[] } | undefined;

function createExtensionContext(cwd: string): ExtensionContext {
  return {
    cwd,
    ui: { theme: plainTheme },
  } as unknown as ExtensionContext;
}

function setupPrettyExtension() {
  const entries: { customType: string; data?: unknown }[] = [];
  const entryRenderers = new Map<string, EntryRenderer>();
  const handlers = new Map<string, EventHandler[]>();
  const tools = new Map<string, unknown>();
  const pi = {
    appendEntry(customType: string, data?: unknown) {
      entries.push({ customType, data });
    },
    on(event: string, handler: EventHandler) {
      const eventHandlers = handlers.get(event) ?? [];
      handlers.set(event, [...eventHandlers, handler]);
    },
    registerEntryRenderer(customType: string, renderer: EntryRenderer) {
      entryRenderers.set(customType, renderer);
    },
    registerTool(tool: { name: string }) {
      tools.set(tool.name, tool);
    },
  } as unknown as ExtensionAPI;

  pretty(pi);

  const emit = (
    event: string,
    payload: unknown,
    ctx: ExtensionContext
  ): void => {
    for (const handler of handlers.get(event) ?? []) {
      handler(payload, ctx);
    }
  };
  const start = (ctx: ExtensionContext): void => {
    emit('session_start', {}, ctx);
  };
  const shutdown = (ctx: ExtensionContext): void => {
    emit('session_shutdown', {}, ctx);
  };

  return { emit, entries, entryRenderers, shutdown, start, tools };
}

describe(formatUserPrompt, () => {
  test('renders dim italic text', () => {
    const styledTheme = {
      fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
      italic: (text: string) => `<italic>${text}</italic>`,
    } as Theme;

    expect(formatUserPrompt(styledTheme, 'Prompt', 80)).toBe(
      '<dim><italic> Prompt</italic></dim>'
    );
  });

  test('styles the truncation ellipsis like the prompt', () => {
    const styledEllipsis = '\u001B[90m\u001B[3m…\u001B[23m\u001B[39m';
    const ansiTheme = {
      fg: (_color: string, text: string) => `\u001B[90m${text}\u001B[39m`,
      italic: (text: string) => `\u001B[3m${text}\u001B[23m`,
    } as Theme;

    expect(formatUserPrompt(ansiTheme, 'First second', 10)).toContain(
      styledEllipsis
    );
  });
});

describe(UserMessageComponent, () => {
  test('renders multiline input as one truncated line', () => {
    const { shutdown, start } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());

    try {
      start(ctx);
      const component = {
        text: 'First\n  second',
      } as unknown as UserMessageComponent;

      const rendered = UserMessageComponent.prototype.render
        .call(component, 10)
        .map((line) => stripVTControlCharacters(line));

      expect(rendered).toStrictEqual([' First se…']);
    } finally {
      shutdown(ctx);
    }
  });
});

describe('turn separator', () => {
  test('renders before later turns without entering message context', () => {
    const { emit, entries, entryRenderers, shutdown } = setupPrettyExtension();
    const firstTurnContext = {
      sessionManager: { getBranch: () => [] },
      ui: { theme: plainTheme },
    } as unknown as ExtensionContext;
    const laterTurnContext = {
      sessionManager: {
        getBranch: () => [{ type: 'message', message: { role: 'assistant' } }],
      },
      ui: { theme: plainTheme },
    } as unknown as ExtensionContext;

    try {
      emit('before_agent_start', {}, firstTurnContext);
      expect(entries).toHaveLength(0);

      emit('before_agent_start', {}, laterTurnContext);
      expect(entries).toStrictEqual([
        { customType: 'pretty-turn-separator', data: undefined },
      ]);

      const renderer = entryRenderers.get('pretty-turn-separator');
      const component = renderer?.({}, { expanded: false }, plainTheme);
      const rendered = component
        ?.render(30)
        .map((line) => stripVTControlCharacters(line));

      expect(rendered).toStrictEqual(['─────── 8< ──────── 8< ───────']);
    } finally {
      shutdown(laterTurnContext);
    }
  });
});

describe(SkillInvocationMessageComponent, () => {
  test('renders like a compact tool regardless of expansion state', () => {
    const { shutdown, start } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());

    try {
      start(ctx);
      const component = {
        expanded: true,
        skillBlock: { name: 'deslop' },
      } as unknown as SkillInvocationMessageComponent;

      expect(
        SkillInvocationMessageComponent.prototype.render.call(component, 80)
      ).toStrictEqual([' ✓ Skill deslop']);
    } finally {
      shutdown(ctx);
    }
  });
});

describe(renderPrettyFooter, () => {
  test('preserves the model name and zero cost beside a long cwd', () => {
    const ctx = {
      sessionManager: {
        getCwd: () => `/tmp/${'project/'.repeat(20)}`,
        getEntries: () => [],
      },
      model: {
        id: 'model-id',
        name: 'Model Name',
        reasoning: false,
        contextWindow: 128_000,
      },
      modelRegistry: {
        isUsingOAuth: () => false,
      },
      getContextUsage: () => ({
        contextWindow: 128_000,
        percent: 0,
      }),
    } as unknown as ExtensionContext;
    const pi = {
      getThinkingLevel: () => 'off',
    } as unknown as ExtensionAPI;

    const footer = renderPrettyFooter(ctx, pi, plainTheme, 50).join('');
    expect(footer).toContain('$0.00');
    expect(footer).toContain('Model Name');
    expect(footer).not.toContain('model-id');
  });

  test('does not shorten a sibling of the home directory', () => {
    const cwd = `${os.homedir()}-backup/project`;
    const ctx = {
      sessionManager: {
        getCwd: () => cwd,
        getEntries: () => [],
      },
      model: {
        id: 'model-id',
        reasoning: false,
        contextWindow: 128_000,
      },
      modelRegistry: {
        isUsingOAuth: () => false,
      },
      getContextUsage: () => ({
        contextWindow: 128_000,
        percent: 0,
      }),
    } as unknown as ExtensionContext;
    const pi = {
      getThinkingLevel: () => 'off',
    } as unknown as ExtensionAPI;

    const footer = renderPrettyFooter(ctx, pi, plainTheme, 100).join('');

    expect(footer).toContain(cwd);
  });

  test('includes nested tool and summary costs', () => {
    const costs = [
      {
        type: 'message',
        message: { role: 'assistant', usage: { cost: { total: 1 } } },
      },
      {
        type: 'message',
        message: { role: 'toolResult', usage: { cost: { total: 2 } } },
      },
      { type: 'branch_summary', usage: { cost: { total: 3 } } },
      { type: 'compaction', usage: { cost: { total: 4 } } },
    ];
    const ctx = {
      sessionManager: {
        getCwd: () => '/tmp/project',
        getEntries: () => costs,
      },
      model: {
        id: 'model-id',
        reasoning: false,
        contextWindow: 128_000,
      },
      modelRegistry: {
        isUsingOAuth: () => false,
      },
      getContextUsage: () => ({
        contextWindow: 128_000,
        percent: 0,
      }),
    } as unknown as ExtensionContext;
    const pi = {
      getThinkingLevel: () => 'off',
    } as unknown as ExtensionAPI;

    const footer = renderPrettyFooter(ctx, pi, plainTheme, 100).join('');

    expect(footer).toContain('$10.00');
  });
});

describe('tool execution', () => {
  test('resolves relative read paths against each execution context', async () => {
    interface CapturedReadTool {
      execute(
        toolCallId: string,
        params: { path: string },
        signal: AbortSignal | undefined,
        onUpdate: undefined,
        ctx: ExtensionContext
      ): Promise<{ content: { type: string; text?: string }[] }>;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pretty-tools-'));
    const firstCwd = path.join(root, 'first');
    const secondCwd = path.join(root, 'second');
    const { shutdown, tools } = setupPrettyExtension();

    try {
      await Promise.all([fs.mkdir(firstCwd), fs.mkdir(secondCwd)]);
      await Promise.all([
        fs.writeFile(path.join(firstCwd, 'value.txt'), 'first'),
        fs.writeFile(path.join(secondCwd, 'value.txt'), 'second'),
      ]);
      const readTool = tools.get('read') as CapturedReadTool;

      const firstResult = await readTool.execute(
        'first-read',
        { path: 'value.txt' },
        undefined,
        undefined,
        createExtensionContext(firstCwd)
      );
      const secondResult = await readTool.execute(
        'second-read',
        { path: 'value.txt' },
        undefined,
        undefined,
        createExtensionContext(secondCwd)
      );

      expect(firstResult.content[0]?.text).toBe('first');
      expect(secondResult.content[0]?.text).toBe('second');
    } finally {
      shutdown(createExtensionContext(firstCwd));
      await fs.rm(root, { force: true, recursive: true });
    }
  });

  test('shows non-streaming tools while execution is pending', () => {
    interface CapturedPendingTool {
      renderCall(
        args: unknown,
        theme: Theme,
        ctx: unknown
      ): { render(width: number): string[] };
    }

    const { shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'columns'
    );
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 100,
    });

    try {
      const toolCases = [
        { args: { path: 'file.ts' }, name: 'read' },
        { args: { pattern: '*.ts' }, name: 'find' },
        { args: { pattern: 'needle' }, name: 'grep' },
        { args: { path: '.' }, name: 'ls' },
        { args: { content: 'text', path: 'file.ts' }, name: 'write' },
        { args: { edits: [], path: 'file.ts' }, name: 'edit' },
      ];

      for (const { args, name } of toolCases) {
        const tool = tools.get(name) as CapturedPendingTool;
        const pendingComponent = tool.renderCall(args, plainTheme, {
          executionStarted: true,
          isPartial: true,
          lastComponent: undefined,
        });
        const pendingOutput = pendingComponent.render(100).join('\n');

        expect(pendingOutput).toContain('∙');

        const completedComponent = tool.renderCall(args, plainTheme, {
          executionStarted: true,
          isPartial: false,
          lastComponent: pendingComponent,
        });

        expect(completedComponent.render(100)).toStrictEqual([]);
      }
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
      shutdown(ctx);
    }
  });

  test('uses the Bash execution status instead of arbitrary output text', () => {
    interface CapturedBashTool {
      renderResult(
        result: unknown,
        options: unknown,
        theme: Theme,
        ctx: unknown
      ): { render(width: number): string[] };
    }

    const { shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'columns'
    );
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 100,
    });

    try {
      const bashTool = tools.get('bash') as CapturedBashTool;
      const successfulComponent = bashTool.renderResult(
        { content: [{ type: 'text', text: 'timeout' }] },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          args: { command: 'echo timeout' },
          isError: false,
          isPartial: false,
          lastComponent: undefined,
        }
      );
      const failedComponent = bashTool.renderResult(
        {
          content: [
            { type: 'text', text: 'output\n\nCommand exited with code 7' },
          ],
        },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          args: { command: 'exit 7' },
          isError: true,
          isPartial: false,
          lastComponent: undefined,
        }
      );
      const successfulOutput = stripVTControlCharacters(
        successfulComponent.render(100).join('\n')
      );
      const failedOutput = stripVTControlCharacters(
        failedComponent.render(100).join('\n')
      );

      expect(successfulOutput).toContain('✓ Bash');
      expect(successfulOutput).not.toContain('Timed out');
      expect(failedOutput).toContain('Exit code 7');
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
      shutdown(ctx);
    }
  });

  test('formats search result counts only after success', () => {
    interface CapturedSearchTool {
      renderResult(
        result: unknown,
        options: unknown,
        theme: Theme,
        ctx: unknown
      ): { render(width: number): string[] };
    }

    const { shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'columns'
    );
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 100,
    });

    try {
      const toolCases = [
        { args: { pattern: '*.ts' }, name: 'find' },
        { args: { pattern: 'needle' }, name: 'grep' },
        { args: { path: '/missing' }, name: 'ls' },
      ];

      for (const { args, name } of toolCases) {
        const tool = tools.get(name) as CapturedSearchTool;
        const failedComponent = tool.renderResult(
          { content: [{ type: 'text', text: 'Search failed' }] },
          { expanded: false, isPartial: false },
          plainTheme,
          {
            args,
            isError: true,
            isPartial: false,
            lastComponent: undefined,
          }
        );
        const successfulComponent = tool.renderResult(
          { content: [{ type: 'text', text: 'Result' }] },
          { expanded: false, isPartial: false },
          plainTheme,
          {
            args,
            isError: false,
            isPartial: false,
            lastComponent: undefined,
          }
        );
        const failedOutput = stripVTControlCharacters(
          failedComponent.render(100).join('\n')
        );
        const successfulOutput = stripVTControlCharacters(
          successfulComponent.render(100).join('\n')
        );

        expect(failedOutput).not.toContain('1 item');
        expect(successfulOutput).toContain('1 item');
        expect(successfulOutput).not.toContain('1 items');
      }
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
      shutdown(ctx);
    }
  });

  test('reflows a completed write heading at the rendered width', () => {
    interface CapturedWriteTool {
      renderResult(
        result: unknown,
        options: unknown,
        theme: Theme,
        ctx: unknown
      ): { render(width: number): string[] };
    }

    const { shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'columns'
    );
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 100,
    });

    try {
      const writeTool = tools.get('write') as CapturedWriteTool;
      const longPath = `${'directory/'.repeat(5)}file.ts`;
      const component = writeTool.renderResult(
        {
          content: [{ type: 'text', text: 'Wrote file.ts' }],
          details: undefined,
        },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          args: { content: 'one\ntwo\n', path: longPath },
          isError: false,
          isPartial: false,
          lastComponent: undefined,
        }
      );
      const narrowOutput = stripVTControlCharacters(
        component.render(30).join('\n')
      );
      const wideOutput = stripVTControlCharacters(
        component.render(100).join('\n')
      );

      expect(narrowOutput).toContain('…');
      expect(wideOutput).toContain(longPath);
      expect(wideOutput).toContain('+2');
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
      shutdown(ctx);
    }
  });

  test('does not show change statistics when an edit fails', () => {
    interface CapturedEditTool {
      renderResult(
        result: unknown,
        options: unknown,
        theme: Theme,
        ctx: unknown
      ): { render(width: number): string[] };
    }

    const { shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      'columns'
    );
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 100,
    });

    try {
      const editTool = tools.get('edit') as CapturedEditTool;
      const component = editTool.renderResult(
        {
          content: [{ type: 'text', text: 'Edit failed' }],
          details: undefined,
        },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          args: {
            edits: [{ newText: 'new', oldText: 'old' }],
            path: 'file.ts',
          },
          isError: true,
          isPartial: false,
          lastComponent: undefined,
        }
      );
      const output = stripVTControlCharacters(component.render(100).join('\n'));

      expect(output).toContain('Edit failed');
      expect(output).not.toContain('+1');
      expect(output).not.toContain('−1');
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(process.stdout, 'columns', columnsDescriptor);
      } else {
        Reflect.deleteProperty(process.stdout, 'columns');
      }
      shutdown(ctx);
    }
  });
});

describe(countLines, () => {
  test('distinguishes empty output from a blank line', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('\n')).toBe(1);
  });

  test('does not count a trailing newline as another line', () => {
    expect(countLines('one\ntwo\n')).toBe(2);
  });
});

describe(getLineDiffStats, () => {
  test('reports no changes for identical content', () => {
    expect(getLineDiffStats('a\nb\nc', 'a\nb\nc')).toStrictEqual({
      added: 0,
      removed: 0,
    });
  });

  test('counts a single-line replacement', () => {
    expect(getLineDiffStats('foo', 'bar')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('counts a middle-line replacement in a multiline snippet', () => {
    expect(getLineDiffStats('a\nb\nc', 'a\nB\nc')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('counts an insertion between existing lines', () => {
    expect(getLineDiffStats('a\nb', 'a\nx\nb')).toStrictEqual({
      added: 1,
      removed: 0,
    });
  });

  test('counts a deletion between existing lines', () => {
    expect(getLineDiffStats('a\nx\nb', 'a\nb')).toStrictEqual({
      added: 0,
      removed: 1,
    });
  });

  test('counts additions from empty content', () => {
    expect(getLineDiffStats('', 'hello')).toStrictEqual({
      added: 1,
      removed: 0,
    });
  });

  test('counts removals to empty content', () => {
    expect(getLineDiffStats('hello', '')).toStrictEqual({
      added: 0,
      removed: 1,
    });
  });

  test('treats both empty strings as unchanged', () => {
    expect(getLineDiffStats('', '')).toStrictEqual({
      added: 0,
      removed: 0,
    });
  });

  test('handles trailing newlines like diffLines', () => {
    expect(getLineDiffStats('foo\n', 'foo\n')).toStrictEqual({
      added: 0,
      removed: 0,
    });
    expect(getLineDiffStats('foo', 'foo\n')).toStrictEqual({
      added: 1,
      removed: 1,
    });
    expect(getLineDiffStats('foo\n', 'foo')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('treats CRLF and LF line tokens as different lines', () => {
    expect(getLineDiffStats('a\r\nb', 'a\nb')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('aggregates multiple edits the way the pretty extension does', () => {
    const edits = [
      { oldText: 'alpha', newText: 'beta' },
      { oldText: 'one\ntwo', newText: 'one\nx\ntwo' },
    ];
    const totals = edits
      .map((edit) => getLineDiffStats(edit.oldText, edit.newText))
      .reduce(
        (summary, stats) => ({
          added: summary.added + stats.added,
          removed: summary.removed + stats.removed,
        }),
        { added: 0, removed: 0 }
      );

    expect(totals).toStrictEqual({ added: 2, removed: 1 });
  });
});
