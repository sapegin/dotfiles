import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_MAX_BYTES,
  type ExecResult,
  type ExtensionAPI,
  type Theme,
} from '@earendil-works/pi-coding-agent';
import { describe, expect, test, vi } from 'vitest';
import registerWebTools from './web-tools.ts';

interface ToolResult {
  content: { type: string; text: string }[];
}

interface CapturedTool<Params> {
  execute(
    toolCallId: string,
    params: Params,
    signal: AbortSignal | undefined
  ): Promise<ToolResult>;
}

interface RenderableTool<Params> extends CapturedTool<Params> {
  renderShell: string;
  renderCall(
    args: Params,
    theme: Theme,
    ctx: unknown
  ): { render(width: number): string[] };
  renderResult(
    result: ToolResult,
    options: unknown,
    theme: Theme,
    ctx: unknown
  ): { render(width: number): string[] };
}

const plainTheme = {
  bold: (text: string) => text,
  fg: (_color: string, text: string) => text,
} as Theme;

function setupWebTools(result: ExecResult) {
  const tools = new Map<string, unknown>();
  const exec = vi.fn<ExtensionAPI['exec']>(() => Promise.resolve(result));
  const pi = {
    exec,
    registerTool(tool: { name: string }) {
      tools.set(tool.name, tool);
    },
  } as unknown as ExtensionAPI;

  registerWebTools(pi);
  return { exec, tools };
}

describe('web tools', () => {
  test('registers search and fetch as separate tools', () => {
    const { tools } = setupWebTools({
      code: 0,
      killed: false,
      stderr: '',
      stdout: '',
    });

    expect([...tools.keys()]).toStrictEqual(['web_search', 'web_fetch']);
  });

  test('renders both tools like Pretty internal tools', () => {
    const { tools } = setupWebTools({
      code: 0,
      killed: false,
      stderr: '',
      stdout: '',
    });
    const toolCases = [
      {
        args: { query: 'current documentation' },
        name: 'web_search',
        title: 'Web search current documentation',
      },
      {
        args: { url: 'https://example.com' },
        name: 'web_fetch',
        title: 'Web fetch https://example.com',
      },
    ];

    for (const { args, name, title } of toolCases) {
      const tool = tools.get(name) as RenderableTool<typeof args>;
      expect(tool.renderShell).toBe('self');

      const pending = tool
        .renderCall(args, plainTheme, {
          executionStarted: true,
          isPartial: true,
          lastComponent: undefined,
        })
        .render(100);
      const completed = tool
        .renderResult(
          { content: [{ type: 'text', text: 'result' }] },
          {},
          plainTheme,
          {
            args,
            isError: false,
            isPartial: false,
            lastComponent: undefined,
          }
        )
        .render(100);
      const failed = tool
        .renderResult(
          { content: [{ type: 'text', text: 'network failed' }] },
          {},
          plainTheme,
          {
            args,
            isError: true,
            isPartial: false,
            lastComponent: undefined,
          }
        )
        .render(100);

      expect(pending).toStrictEqual([` ∙ ${title}`]);
      expect(completed).toStrictEqual([` ✓ ${title}`]);
      expect(failed).toStrictEqual([` ✕ ${title}`, '   network failed ']);
    }
  });

  test('passes structured search options without shell interpolation', async () => {
    const resultJson = '[{"title":"Example","url":"https://example.com"}]';
    const { exec, tools } = setupWebTools({
      code: 0,
      killed: false,
      stderr: '',
      stdout: resultJson,
    });
    const tool = tools.get('web_search') as CapturedTool<{
      query: string;
      limit?: number;
      site?: string;
      time?: 'd' | 'w' | 'm' | 'y';
    }>;

    const result = await tool.execute(
      'search',
      {
        limit: 5,
        query: 'parse "JSON"; echo unsafe',
        site: 'stackoverflow.com',
        time: 'w',
      },
      undefined
    );

    expect(exec).toHaveBeenCalledWith(
      'ddgr',
      [
        '--noua',
        '--json',
        '--num',
        '5',
        '--time',
        'w',
        '--site',
        'stackoverflow.com',
        'parse "JSON"; echo unsafe',
      ],
      { signal: undefined, timeout: 30_000 }
    );
    expect(result.content[0]?.text).toBe(resultJson);
  });

  test('rejects non-web URLs before invoking Trafilatura', async () => {
    const { exec, tools } = setupWebTools({
      code: 0,
      killed: false,
      stderr: '',
      stdout: '',
    });
    const tool = tools.get('web_fetch') as CapturedTool<{ url: string }>;

    await expect(
      tool.execute('fetch', { url: 'file:///etc/passwd' }, undefined)
    ).rejects.toThrow('Unsupported URL protocol: file:');
    expect(exec).not.toHaveBeenCalled();
  });

  test('forwards actionable subprocess stderr unchanged', async () => {
    const { tools } = setupWebTools({
      code: 1,
      killed: false,
      stderr: 'network failed\n',
      stdout: '',
    });
    const tool = tools.get('web_fetch') as CapturedTool<{ url: string }>;

    await expect(
      tool.execute('fetch', { url: 'https://example.com' }, undefined)
    ).rejects.toMatchObject({ message: 'network failed\n' });
  });

  test('truncates large pages and preserves the full output in a temporary file', async () => {
    const page = 'x'.repeat(DEFAULT_MAX_BYTES + 1);
    const { tools } = setupWebTools({
      code: 0,
      killed: false,
      stderr: '',
      stdout: page,
    });
    const tool = tools.get('web_fetch') as CapturedTool<{ url: string }>;
    let fullOutputPath: string | undefined;

    try {
      const result = await tool.execute(
        'fetch',
        { url: 'https://example.com' },
        undefined
      );
      const text = result.content[0]?.text ?? '';
      const pathMatch = text.match(/Full output saved to: (.+)]$/);
      fullOutputPath = pathMatch?.[1];

      expect(text).toContain('[Output truncated:');
      if (fullOutputPath === undefined) {
        throw new Error('Expected full output path');
      }
      await expect(fs.readFile(fullOutputPath, 'utf8')).resolves.toBe(page);
    } finally {
      if (fullOutputPath) {
        await fs.rm(path.dirname(fullOutputPath), {
          force: true,
          recursive: true,
        });
      }
    }
  });
});
