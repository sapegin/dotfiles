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
  dimMessageSeparatorLine,
  formatUserPrompt,
  getLineDiffStats,
  MESSAGE_SEPARATOR,
  renderPrettyFooter,
} from './pretty.ts';

const plainTheme = {
  bold: (text: string) => text,
  fg: (_color: string, text: string) => text,
  italic: (text: string) => text,
} as Theme;

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown;

function createExtensionContext(cwd: string): ExtensionContext {
  return {
    cwd,
    ui: { theme: plainTheme },
  } as unknown as ExtensionContext;
}

function setupPrettyExtension() {
  const handlers = new Map<string, EventHandler[]>();
  const tools = new Map<string, unknown>();
  const pi = {
    on(event: string, handler: EventHandler) {
      const eventHandlers = handlers.get(event) ?? [];
      handlers.set(event, [...eventHandlers, handler]);
    },
    registerTool(tool: { name: string }) {
      tools.set(tool.name, tool);
    },
  } as unknown as ExtensionAPI;

  pretty(pi);

  const runHandlers = (event: string, ctx: ExtensionContext): void => {
    for (const handler of handlers.get(event) ?? []) {
      handler({}, ctx);
    }
  };
  const start = (ctx: ExtensionContext): void => {
    runHandlers('session_start', ctx);
  };
  const shutdown = (ctx: ExtensionContext): void => {
    runHandlers('session_shutdown', ctx);
  };

  return { shutdown, start, tools };
}

describe(formatUserPrompt, () => {
  test('renders multiline input as one truncated line', () => {
    expect(
      stripVTControlCharacters(
        formatUserPrompt(plainTheme, 'First\n  second', 10)
      )
    ).toBe(' First se…');
  });

  test('renders the prompt in dim italic text', () => {
    const styledTheme = {
      fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
      italic: (text: string) => `<italic>${text}</italic>`,
    } as Theme;

    expect(formatUserPrompt(styledTheme, 'Prompt', 80)).toBe(
      '<dim><italic> Prompt</italic></dim>'
    );
  });

  test('does not render an empty prompt', () => {
    expect(formatUserPrompt(plainTheme, ' \n ', 80)).toBe('');
  });
});

describe(dimMessageSeparatorLine, () => {
  test('colors only the message separator as dim text', () => {
    const theme = {
      fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
    } as Theme;

    expect(dimMessageSeparatorLine(theme, MESSAGE_SEPARATOR)).toBe(
      `<dim>${MESSAGE_SEPARATOR}</dim>`
    );
    expect(dimMessageSeparatorLine(theme, 'Reply')).toBe('Reply');
  });
});

describe(UserMessageComponent, () => {
  test('renders a horizontal rule before the prompt', () => {
    const { shutdown, start } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());

    try {
      start(ctx);
      const component = {
        text: 'Prompt',
      } as unknown as UserMessageComponent;

      expect(
        UserMessageComponent.prototype.render.call(component, 80)
      ).toStrictEqual([MESSAGE_SEPARATOR, '', ' Prompt']);
    } finally {
      shutdown(ctx);
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
  test('prefers the model name and always displays zero cost', () => {
    const ctx = {
      sessionManager: {
        getCwd: () => '/tmp/project',
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

    const footer = renderPrettyFooter(ctx, pi, plainTheme, 100, true).join('');
    expect(footer).toContain('$0.00');
    expect(footer).toContain('Model Name');
    expect(footer).not.toContain('model-id');
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
