import os from 'node:os';
import { stripVTControlCharacters } from 'node:util';
import {
  type ExtensionAPI,
  type ExtensionContext,
  SkillInvocationMessageComponent,
  type Theme,
  type ToolRendererResolver,
  type ToolRenderers,
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

function setupPrettyExtension(fallback?: ToolRenderers) {
  const entries: { customType: string; data?: unknown }[] = [];
  const entryRenderers = new Map<string, EntryRenderer>();
  const handlers = new Map<string, EventHandler[]>();
  const rendererResolvers: ToolRendererResolver[] = [];
  const replacedTools: string[] = [];
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
      replacedTools.push(tool.name);
    },
    registerToolRenderer(resolver: ToolRendererResolver) {
      rendererResolvers.push(resolver);
    },
  } as unknown as ExtensionAPI;

  pretty(pi);

  const resolveToolRenderers = (
    toolName: string,
    index = 0
  ): ToolRenderers | undefined =>
    rendererResolvers[index]?.(toolName, () =>
      resolveToolRenderers(toolName, index + 1)
    ) ?? fallback;
  const tools = new Map(
    ['bash', 'codemode', 'edit', 'find', 'grep', 'ls', 'read', 'write'].map(
      (toolName) => [toolName, resolveToolRenderers(toolName)]
    )
  );

  const emit = (
    event: string,
    payload: unknown,
    ctx: ExtensionContext
  ): unknown => {
    let result: unknown;
    for (const handler of handlers.get(event) ?? []) {
      result = handler(payload, ctx) ?? result;
    }
    return result;
  };
  const start = (ctx: ExtensionContext): void => {
    emit('session_start', {}, ctx);
  };
  const shutdown = (ctx: ExtensionContext): void => {
    emit('session_shutdown', {}, ctx);
  };

  return {
    emit,
    entries,
    entryRenderers,
    replacedTools,
    resolveToolRenderers,
    shutdown,
    start,
    tools,
  };
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
      { type: 'usage', usage: { cost: { total: 5 } } },
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

    expect(footer).toContain('$15.00');
  });
});

describe('tool rendering', () => {
  test('registers renderers without replacing built-in tools', () => {
    const { replacedTools, tools } = setupPrettyExtension();

    expect(replacedTools).toStrictEqual([]);
    expect([...tools.keys()]).toStrictEqual([
      'bash',
      'codemode',
      'edit',
      'find',
      'grep',
      'ls',
      'read',
      'write',
    ]);
    expect([...tools.values()].every(Boolean)).toBe(true);
  });

  test.each([
    {
      name: 'grep',
      args: JSON.stringify({
        pattern: 'Renderer|getTools\\(',
        path: 'node_modules',
        limit: 25,
      }),
      expected: 'Grep Renderer|getTools\\(',
    },
    {
      name: 'bash',
      args: JSON.stringify({ command: 'echo "hello"\npwd', timeout: 30 }),
      expected: 'Bash echo "hello" ↵ pwd',
    },
    {
      name: 'bash',
      args: '{"command":"npm exec -- oxfmt --write pi/agent/extensions/pretty.ts...',
      expected:
        'Bash npm exec -- oxfmt --write pi/agent/extensions/pretty.ts...',
    },
    {
      name: 'grep',
      args: '{"pattern":"Renderer|getTools\\\\(","path":"node_modules/@earendil...',
      expected: 'Grep Renderer|getTools\\(',
    },
    {
      name: 'read',
      args: JSON.stringify({ path: `${os.homedir()}/file.ts`, limit: 200 }),
      expected: 'Read ~/file.ts',
    },
    {
      name: 'write',
      args: JSON.stringify({ path: 'file.ts', content: 'secret contents' }),
      expected: 'Write file.ts',
    },
    {
      name: 'edit',
      args: JSON.stringify({ path: 'file.ts', edits: [] }),
      expected: 'Edit file.ts',
    },
    {
      name: 'ls',
      args: JSON.stringify({ path: '.', limit: 20 }),
      expected: 'List .',
    },
    {
      name: 'find',
      args: JSON.stringify({ pattern: '*.ts', path: 'src' }),
      expected: 'Find *.ts',
    },
  ])(
    'formats $name preview with only its main field',
    ({ name, args, expected }) => {
      const { shutdown, tools } = setupPrettyExtension();
      const ctx = createExtensionContext(process.cwd());
      try {
        const component = tools.get('codemode')?.renderResult?.(
          {
            content: [],
            details: { calls: [{ id: 'parent/1', name, args, status: 'ok' }] },
          },
          { expanded: false, isPartial: false },
          plainTheme,
          {
            args: { code: 'await tools.read({path:"file.ts"});' },
            toolCallId: 'parent',
            isPartial: false,
            isError: false,
          } as Parameters<NonNullable<ToolRenderers['renderResult']>>[3]
        );
        expect(
          component?.render(200).map(stripVTControlCharacters).at(-1)
        ).toBe(` ✓ ${expected}`);
        expect(
          component
            ?.render(30)
            .every((line) => stripVTControlCharacters(line).length <= 30)
        ).toBe(true);
      } finally {
        shutdown(ctx);
      }
    }
  );

  test('leaves custom renderers and their codemode previews intact', () => {
    const fallback: ToolRenderers = {
      renderCall: () => ({
        render: () => ['existing custom renderer'],
        invalidate() {},
      }),
    };
    const { emit, resolveToolRenderers, shutdown, tools } =
      setupPrettyExtension(fallback);
    const ctx = createExtensionContext(process.cwd());
    try {
      expect(resolveToolRenderers('custom')).toBe(fallback);
      emit(
        'tool_execution_start',
        {
          toolCallId: 'parent/1',
          parentToolCallId: 'parent',
          toolName: 'custom',
          args: { query: 'needle' },
        },
        ctx
      );
      emit(
        'tool_result',
        {
          toolCallId: 'parent/1',
          parentToolCallId: 'parent',
          toolName: 'custom',
          input: { query: 'needle' },
          content: [],
          isError: false,
        },
        ctx
      );
      expect(
        emit(
          'tool_result',
          { toolCallId: 'parent', toolName: 'codemode', details: {} },
          ctx
        )
      ).toBeUndefined();
      const component = tools.get('codemode')?.renderResult?.(
        {
          content: [],
          details: {
            calls: [
              {
                id: 'parent/1',
                name: 'custom',
                args: '{"query":"needle"}',
                status: 'ok',
              },
            ],
          },
        },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          args: { code: 'await tools.custom({query:"needle"});' },
          toolCallId: 'parent',
          isPartial: false,
          isError: false,
        } as Parameters<NonNullable<ToolRenderers['renderResult']>>[3]
      );
      expect(component?.render(80).map(stripVTControlCharacters).at(-1)).toBe(
        ' ✓ Custom {"query":"needle"}'
      );
    } finally {
      shutdown(ctx);
    }
  });

  test.each([
    { name: 'read', args: { path: 'file.ts' } },
    { name: 'find', args: { pattern: '*.ts' } },
    { name: 'grep', args: { pattern: 'needle' } },
    { name: 'ls', args: { path: '.' } },
    { name: 'write', args: { path: 'file.ts', content: 'text' } },
    { name: 'edit', args: { path: 'file.ts', edits: [] } },
    { name: 'bash', args: { command: 'echo hello' } },
  ])('matches pending direct and nested $name rows', ({ name, args }) => {
    const { emit, shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    type RenderContext = Parameters<
      NonNullable<ToolRenderers['renderResult']>
    >[3];
    const renderContext = {
      args,
      toolCallId: 'parent/1',
      executionStarted: true,
      isPartial: true,
      isError: false,
    } as RenderContext;
    try {
      emit(
        'tool_execution_start',
        {
          toolCallId: 'parent/1',
          parentToolCallId: 'parent',
          toolName: name,
          args,
        },
        ctx
      );
      const direct = tools
        .get(name)
        ?.renderCall?.(args, plainTheme, renderContext);
      const nested = tools
        .get('codemode')
        ?.renderResult?.(
          { content: [], details: { calls: [] } },
          { expanded: false, isPartial: true },
          plainTheme,
          {
            ...renderContext,
            args: { code: 'await tools.read({path:"file.ts"});' },
            toolCallId: 'parent',
          }
        );
      expect(direct).toBeDefined();
      for (const width of [30, 80]) {
        expect(nested?.render(width).slice(1)).toStrictEqual(
          direct?.render(width)
        );
      }
    } finally {
      shutdown(ctx);
    }
  });

  test.each([false, true])(
    'matches streaming Bash rows through completion (error: %s)',
    (isError) => {
      const { emit, shutdown, tools } = setupPrettyExtension();
      const ctx = createExtensionContext(process.cwd());
      type RenderContext = Parameters<
        NonNullable<ToolRenderers['renderResult']>
      >[3];
      const args = { command: 'echo ready; sleep 30' };
      let redraws = 0;
      const renderContext = {
        args,
        toolCallId: 'parent/1',
        executionStarted: true,
        isPartial: true,
        isError: false,
      } as RenderContext;
      const parentContext = {
        ...renderContext,
        args: { code: 'await tools.bash({command:"echo ready; sleep 30"});' },
        toolCallId: 'parent',
        invalidate() {
          redraws += 1;
        },
      };
      try {
        emit(
          'tool_execution_start',
          {
            toolCallId: 'parent/1',
            parentToolCallId: 'parent',
            toolName: 'bash',
            args,
          },
          ctx
        );
        const parent = tools
          .get('codemode')
          ?.renderResult?.(
            { content: [], details: { calls: [] } },
            { expanded: false, isPartial: true },
            plainTheme,
            parentContext
          );
        expect(parent?.render(80).slice(1)).toStrictEqual([]);
        for (const content of [
          [],
          [{ type: 'text' as const, text: 'ready'.repeat(10_000) }],
        ]) {
          const partialResult = { content, details: undefined };
          emit(
            'tool_execution_update',
            {
              toolCallId: 'parent/1',
              parentToolCallId: 'parent',
              toolName: 'bash',
              args,
              partialResult,
            },
            ctx
          );
          const direct = tools
            .get('bash')
            ?.renderResult?.(
              partialResult,
              { expanded: false, isPartial: true },
              plainTheme,
              renderContext
            );
          expect(direct).toBeDefined();
          for (const width of [30, 80]) {
            expect(parent?.render(width).slice(1)).toStrictEqual(
              direct?.render(width)
            );
          }
          expect(
            parent?.render(80).map(stripVTControlCharacters).at(-1)
          ).toContain('∙ Bash');
        }
        expect(redraws).toBe(2);
        const result = {
          content: [
            {
              type: 'text' as const,
              text: isError
                ? 'Command exited with code 7'
                : 'ready'.repeat(10_000),
            },
          ],
          details: undefined,
        };
        emit(
          'tool_result',
          {
            toolCallId: 'parent/1',
            parentToolCallId: 'parent',
            toolName: 'bash',
            input: args,
            ...result,
            isError,
          },
          ctx
        );
        const completed = tools
          .get('bash')
          ?.renderResult?.(
            result,
            { expanded: false, isPartial: false },
            plainTheme,
            { ...renderContext, isPartial: false, isError }
          );
        expect(parent?.render(80).slice(1)).toStrictEqual(
          completed?.render(80)
        );
        const saved = emit(
          'tool_result',
          {
            toolCallId: 'parent',
            toolName: 'codemode',
            details: { calls: [] },
          },
          ctx
        ) as { details: unknown };
        expect(saved.details).toStrictEqual({
          calls: [],
          prettySummaries: [
            {
              id: 'parent/1',
              name: 'bash',
              value: args.command,
              status: isError ? 'error' : 'success',
              error: isError ? 'Exit code 7' : undefined,
            },
          ],
        });
        emit(
          'tool_execution_start',
          {
            toolCallId: 'parent/2',
            parentToolCallId: 'parent',
            toolName: 'bash',
            args,
          },
          ctx
        );
        emit(
          'tool_execution_update',
          {
            toolCallId: 'parent/2',
            parentToolCallId: 'parent',
            toolName: 'bash',
            args,
            partialResult: { content: [], details: undefined },
          },
          ctx
        );
        expect(redraws).toBe(2);
      } finally {
        shutdown(ctx);
      }
    }
  );

  test.each([
    {
      scriptError: 'Error: Path not found: /missing',
      nestedError: 'Path not found: /missing',
      previewError: 'Path not found: /missing',
      duplicate: true,
      withSummary: true,
    },
    {
      scriptError: 'Error: ENOENT: missing file',
      nestedError: 'File not found',
      previewError: 'ENOENT: missing file',
      duplicate: true,
      withSummary: true,
    },
    {
      scriptError: 'Error: Path not found: /missing',
      nestedError: 'Path not found: /missing',
      previewError: 'Path not found: /missing',
      duplicate: true,
      withSummary: false,
    },
    {
      scriptError: 'Error: script logic broke',
      nestedError: 'Path not found: /missing',
      previewError: 'Path not found: /missing',
      duplicate: false,
      withSummary: true,
    },
    {
      scriptError: 'TypeError: Path not found: /missing',
      nestedError: 'Path not found: /missing',
      previewError: 'Path not found: /missing',
      duplicate: false,
      withSummary: true,
    },
  ])(
    'deduplicates only repeated script errors: $scriptError (summary: $withSummary)',
    ({ scriptError, nestedError, previewError, duplicate, withSummary }) => {
      const { shutdown, tools } = setupPrettyExtension();
      const ctx = createExtensionContext(process.cwd());
      try {
        for (const expanded of [false, true]) {
          const component = tools.get('codemode')?.renderResult?.(
            {
              content: [
                {
                  type: 'text',
                  text: 'Script failed\nWall time 0.1 seconds\nOutput:\n',
                },
                {
                  type: 'text',
                  text: `Script error:\n${scriptError}\n    at script (eval:1)\n\nTool calls made before the failure (they are not undone): grep (error)`,
                },
              ],
              details: {
                calls: [
                  {
                    id: 'parent/1',
                    name: 'grep',
                    args: '{"pattern":"needle"}',
                    status: 'error',
                    error: previewError,
                  },
                ],
                prettySummaries: withSummary
                  ? [
                      {
                        id: 'parent/1',
                        name: 'grep',
                        value: 'needle',
                        status: 'error',
                        error: nestedError,
                      },
                    ]
                  : undefined,
              },
            },
            { expanded, isPartial: false },
            plainTheme,
            {
              args: { code: 'text("script should stay hidden");' },
              toolCallId: 'parent',
              isPartial: false,
              isError: true,
            } as Parameters<NonNullable<ToolRenderers['renderResult']>>[3]
          );
          expect(
            component
              ?.render(100)
              .map((line) => stripVTControlCharacters(line).trim())
          ).toStrictEqual([
            '✕ Codemode',
            ...(duplicate ? [] : [scriptError]),
            '✕ Grep needle',
            withSummary ? nestedError : previewError,
          ]);
        }
      } finally {
        shutdown(ctx);
      }
    }
  );

  test('keeps codemode compact while pending and reports script errors', () => {
    const { emit, shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const tool = tools.get('codemode');
    type RenderContext = Parameters<
      NonNullable<ToolRenderers['renderResult']>
    >[3];
    const renderContext = {
      args: {
        code: '// @options: {"max_output_tokens": 5000}\ntext(await tools.read({path:"package.json"}));',
      },
      toolCallId: 'parent',
      executionStarted: true,
      isPartial: true,
      isError: false,
    } as RenderContext;
    try {
      emit(
        'tool_execution_start',
        {
          toolCallId: 'parent/1',
          parentToolCallId: 'parent',
          toolName: 'read',
          args: { path: 'package.json' },
        },
        ctx
      );
      expect(
        tool
          ?.renderCall?.(renderContext.args, plainTheme, renderContext)
          .render(80)
      ).toStrictEqual([]);
      const pending = tool?.renderResult?.(
        {
          content: [],
          details: {
            calls: [
              {
                id: 'parent/?',
                name: 'read',
                args: '{"path":"package.json"}',
                status: 'running',
              },
            ],
          },
        },
        { expanded: false, isPartial: true },
        plainTheme,
        renderContext
      );
      const pendingLines = pending?.render(80).map(stripVTControlCharacters);
      expect(pendingLines?.[0]).toBe(' ∙ Codemode');
      expect(pendingLines?.slice(1)).toStrictEqual([' ∙ Read package.json']);
      expect(pendingLines?.join('\n')).not.toContain('@options');
      expect(
        pending
          ?.render(20)
          .every((line) => stripVTControlCharacters(line).length <= 20)
      ).toBe(true);
      const failed = tool?.renderResult?.(
        {
          content: [
            {
              type: 'text',
              text: 'Script failed\nWall time 0.1 seconds\nOutput:\n\nScript error:\nboom',
            },
          ],
          details: undefined,
        },
        { expanded: false, isPartial: false },
        plainTheme,
        {
          ...renderContext,
          toolCallId: 'failed',
          isPartial: false,
          isError: true,
        }
      );
      expect(
        failed?.render(80).map(stripVTControlCharacters).join('\n')
      ).toContain('✕ Codemode');
      expect(
        failed?.render(80).map(stripVTControlCharacters).at(-1)?.trim()
      ).toBe('boom');
    } finally {
      shutdown(ctx);
    }
  });

  test('uses execution events rather than placeholders for repeated built-in rows', () => {
    const { emit, shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    let redraws = 0;
    try {
      for (const toolCallId of ['parent/1', 'parent/2']) {
        emit(
          'tool_execution_start',
          {
            toolCallId,
            parentToolCallId: 'parent',
            toolName: 'read',
            args: { path: 'file.ts' },
          },
          ctx
        );
      }
      emit(
        'tool_result',
        {
          toolCallId: 'parent/1',
          parentToolCallId: 'parent',
          toolName: 'read',
          input: { path: 'file.ts' },
          content: [],
          isError: false,
        },
        ctx
      );
      const component = tools.get('codemode')?.renderResult?.(
        {
          content: [],
          details: {
            calls: [
              {
                id: 'parent/?',
                name: 'read',
                args: '{"path":"file.ts"}',
                status: 'running',
              },
              {
                id: 'parent/1',
                name: 'read',
                args: '{"path":"file.ts"}',
                status: 'ok',
              },
              {
                id: 'parent/?',
                name: 'read',
                args: '{"path":"file.ts"}',
                status: 'running',
              },
              {
                id: 'parent/?',
                name: 'grep',
                args: '{"pattern":"needle"}',
                status: 'running',
              },
              {
                id: 'parent/custom/1',
                name: 'custom',
                args: '{"query":"needle"}',
                status: 'ok',
              },
              {
                id: 'parent/model/1',
                name: 'models.classify',
                args: 'provider/model',
                status: 'ok',
                cost: 0.02,
              },
            ],
          },
        },
        { expanded: false, isPartial: true },
        plainTheme,
        {
          args: { code: 'await Promise.all(calls);' },
          toolCallId: 'parent',
          isPartial: true,
          isError: false,
          invalidate() {
            redraws += 1;
          },
        } as Parameters<NonNullable<ToolRenderers['renderResult']>>[3]
      );
      expect(
        component?.render(80).map(stripVTControlCharacters).slice(1)
      ).toStrictEqual([
        ' ✓ Read file.ts',
        ' ∙ Read file.ts',
        ' ✓ Custom {"query":"needle"}',
        ' ✓ Models.classify provider/model $0.02',
      ]);
      emit(
        'tool_execution_start',
        {
          toolCallId: 'parent/3',
          parentToolCallId: 'parent',
          toolName: 'read',
          args: { path: 'other.ts' },
        },
        ctx
      );
      emit(
        'tool_execution_start',
        {
          toolCallId: 'parent/4',
          parentToolCallId: 'parent',
          toolName: 'grep',
          args: { pattern: 'needle' },
        },
        ctx
      );
      expect(redraws).toBe(2);
      expect(
        component?.render(80).map(stripVTControlCharacters).slice(1)
      ).toStrictEqual([
        ' ✓ Read file.ts',
        ' ∙ Read file.ts',
        ' ∙ Read other.ts',
        ' ∙ Grep needle',
        ' ✓ Custom {"query":"needle"}',
        ' ✓ Models.classify provider/model $0.02',
      ]);
    } finally {
      shutdown(ctx);
    }
  });

  test('renders nested results like direct calls after resume', () => {
    const { emit, shutdown, tools } = setupPrettyExtension();
    const ctx = createExtensionContext(process.cwd());
    const cases = [
      {
        name: 'read',
        args: { path: 'package.json' },
        output: 'large file contents'.repeat(10_000),
      },
      {
        name: 'bash',
        args: { command: 'echo hello' },
        output: 'hello'.repeat(10_000),
      },
      { name: 'find', args: { pattern: '*.ts' }, output: 'a.ts\nb.ts' },
      { name: 'grep', args: { pattern: 'needle' }, output: 'a.ts:1:needle' },
      { name: 'ls', args: { path: '.' }, output: 'a.ts' },
      {
        name: 'write',
        args: { path: 'a.ts', content: `${'one'.repeat(10_000)}\ntwo` },
        output: 'Written',
      },
      {
        name: 'edit',
        args: {
          path: 'a.ts',
          edits: [
            { oldText: 'old'.repeat(10_000), newText: 'new'.repeat(10_000) },
          ],
        },
        output: 'Edited',
      },
      {
        name: 'read',
        args: { path: '/missing' },
        output: 'ENOENT: not found',
        isError: true,
      },
      {
        name: 'bash',
        args: { command: 'exit 7' },
        output: 'Command exited with code 7',
        isError: true,
      },
    ];
    type RenderContext = Parameters<
      NonNullable<ToolRenderers['renderResult']>
    >[3];
    try {
      const directComponents: { render(width: number): string[] }[] = [];
      for (const [index, call] of cases.entries()) {
        const toolCallId = `parent/${index}`;
        const result = {
          content: [{ type: 'text' as const, text: call.output }],
          details: { unusedPayload: 'unused result details'.repeat(10_000) },
        };
        emit(
          'tool_execution_start',
          {
            toolCallId,
            parentToolCallId: 'parent',
            toolName: call.name,
            args: call.args,
          },
          ctx
        );
        emit(
          'tool_result',
          {
            toolCallId,
            parentToolCallId: 'parent',
            toolName: call.name,
            input: call.args,
            ...result,
            isError: call.isError ?? false,
          },
          ctx
        );
        const component = tools
          .get(call.name)
          ?.renderResult?.(
            result,
            { expanded: false, isPartial: false },
            plainTheme,
            {
              args: call.args,
              toolCallId,
              isPartial: false,
              isError: call.isError ?? false,
            } as RenderContext
          );
        expect(component).toBeDefined();
        if (component) {
          directComponents.push(component);
        }
      }
      const saved = emit(
        'tool_result',
        { toolName: 'codemode', toolCallId: 'parent', details: { calls: [] } },
        ctx
      ) as { details: unknown };
      expect(saved.details).toStrictEqual({
        calls: [],
        prettySummaries: [
          {
            id: 'parent/0',
            name: 'read',
            value: 'package.json',
            status: 'success',
          },
          {
            id: 'parent/1',
            name: 'bash',
            value: 'echo hello',
            status: 'success',
            error: undefined,
          },
          {
            id: 'parent/2',
            name: 'find',
            value: '*.ts',
            status: 'success',
            count: 2,
          },
          {
            id: 'parent/3',
            name: 'grep',
            value: 'needle',
            status: 'success',
            count: 1,
          },
          {
            id: 'parent/4',
            name: 'ls',
            value: '.',
            status: 'success',
            count: 1,
          },
          {
            id: 'parent/5',
            name: 'write',
            value: 'a.ts',
            status: 'success',
            diff: { added: 2, removed: 0 },
          },
          {
            id: 'parent/6',
            name: 'edit',
            value: 'a.ts',
            status: 'success',
            diff: { added: 1, removed: 1 },
          },
          {
            id: 'parent/7',
            name: 'read',
            value: '/missing',
            status: 'error',
            error: 'File not found',
          },
          {
            id: 'parent/8',
            name: 'bash',
            value: 'exit 7',
            status: 'error',
            error: 'Exit code 7',
          },
        ],
      });
      expect(JSON.stringify(saved.details).length).toBeLessThan(2048);
      shutdown(ctx);
      const resumed = setupPrettyExtension();
      try {
        for (const { expanded, width } of [false, true].flatMap((isExpanded) =>
          [30, 80, 160].map((renderWidth) => ({
            expanded: isExpanded,
            width: renderWidth,
          }))
        )) {
          const component = resumed.tools.get('codemode')?.renderResult?.(
            {
              content: [{ type: 'text', text: 'verbose JSON output' }],
              details: saved.details,
            },
            { expanded, isPartial: false },
            plainTheme,
            {
              args: {
                code: 'text(await tools.read({path:"package.json"}));',
              },
              toolCallId: 'parent',
              isPartial: false,
              isError: false,
            } as RenderContext
          );
          const lines = component?.render(width).map(stripVTControlCharacters);
          expect(lines?.[0]).toBe(' ✓ Codemode');
          expect(lines?.slice(1)).toStrictEqual(
            directComponents
              .flatMap((direct) => direct.render(width))
              .map(stripVTControlCharacters)
          );
          expect(lines?.join('\n')).not.toContain('verbose JSON output');
        }
      } finally {
        resumed.shutdown(ctx);
      }
    } finally {
      shutdown(ctx);
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
