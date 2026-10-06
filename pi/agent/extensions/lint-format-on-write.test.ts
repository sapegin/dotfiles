import {
  type ExecResult,
  type ExtensionAPI,
  type ExtensionContext,
  type ToolResultEvent,
  type ToolResultEventResult,
} from '@earendil-works/pi-coding-agent';
import { describe, expect, test, vi } from 'vitest';
import lintFormatOnWrite from './lint-format-on-write.ts';

type ToolResultHandler = (
  event: ToolResultEvent,
  ctx: ExtensionContext
) => Promise<ToolResultEventResult | undefined>;

describe(lintFormatOnWrite, () => {
  test('uses Pi execution and preserves structured content in augmented results', async () => {
    let handler: ToolResultHandler | undefined;
    const failedFix: ExecResult = {
      code: 1,
      killed: false,
      stderr: '',
      stdout: 'fix failed',
    };
    const failedCheck: ExecResult = {
      code: 1,
      killed: false,
      stderr: '',
      stdout: 'remaining issue',
    };
    const exec = vi
      .fn<ExtensionAPI['exec']>()
      .mockResolvedValueOnce(failedFix)
      .mockResolvedValueOnce(failedCheck);
    const pi = {
      exec,
      on(event: string, registeredHandler: ToolResultHandler) {
        if (event === 'tool_result') {
          handler = registeredHandler;
        }
      },
    } as unknown as ExtensionAPI;
    lintFormatOnWrite(pi);
    if (!handler) {
      throw new Error('Expected tool_result handler');
    }

    const structuredContent = { path: 'file.ts', written: true };
    const result = await handler(
      {
        type: 'tool_result',
        toolCallId: 'write-1',
        toolName: 'write',
        input: { content: 'const value = 1;', path: 'file.ts' },
        content: [{ type: 'text', text: 'Wrote file.ts' }],
        details: undefined,
        structuredContent,
        isError: false,
      },
      {
        cwd: '/tmp/project',
        signal: AbortSignal.timeout(1000),
      } as unknown as ExtensionContext
    );

    expect(exec).toHaveBeenNthCalledWith(
      1,
      '/usr/bin/env',
      [
        expect.stringMatching(/^PATH=/),
        'oxlint',
        '--fix',
        '--quiet',
        'file.ts',
      ],
      expect.objectContaining({ cwd: '/tmp/project' })
    );
    expect(result).toStrictEqual({
      content: [
        { type: 'text', text: 'Wrote file.ts' },
        { type: 'text', text: 'remaining issue' },
      ],
      structuredContent,
    });
  });
});
