import {
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const agentSessionMocks = vi.hoisted(() => ({
  model: vi.fn<(model: unknown) => void>(),
  prompt: vi.fn<(prompt: string) => void>(),
  responseText: 'Error mapping review',
}));

vi.mock(import('@earendil-works/pi-coding-agent'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    createAgentSession: (
      options: Parameters<typeof actual.createAgentSession>[0]
    ) => {
      agentSessionMocks.model(options?.model);
      const messages: unknown[] = [];
      const session = {
        abort: vi.fn<() => void>(),
        dispose: vi.fn<() => void>(),
        messages,
        prompt(prompt: string) {
          agentSessionMocks.prompt(prompt);
          messages.push({
            role: 'assistant',
            content: [{ type: 'text', text: agentSessionMocks.responseText }],
          });
          return Promise.resolve();
        },
      };

      return Promise.resolve({ session }) as unknown as ReturnType<
        typeof actual.createAgentSession
      >;
    },
  };
});

import sessionName, { normalizeSessionName } from './session-name.ts';

type EventHandler = (event: any, ctx: ExtensionContext) => unknown;

function setupExtension(branchName?: string) {
  const handlers = new Map<string, EventHandler[]>();
  let sessionNameValue: string | undefined;
  const pi = {
    exec: vi.fn<ExtensionAPI['exec']>(() =>
      Promise.resolve({
        code: branchName ? 0 : 128,
        killed: false,
        stderr: '',
        stdout: branchName ? `${branchName}\n` : '',
      })
    ),
    getSessionName: () => sessionNameValue,
    on(event: string, handler: EventHandler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    },
    setSessionName(name: string) {
      sessionNameValue = name;
    },
  } as unknown as ExtensionAPI;
  const ctx = {
    cwd: '/tmp/project',
    modelRegistry: {
      getAvailable: () => [
        {
          id: 'cheap-input',
          cost: { input: 0, output: 100 },
          maxTokens: 100,
          thinkingLevelMap: { off: 0 },
        },
        {
          id: 'cheap-output',
          cost: { input: 1, output: 0 },
          maxTokens: 100,
          thinkingLevelMap: { off: 0 },
        },
      ],
    },
    sessionManager: { getEntries: () => [] },
    ui: { setTitle: vi.fn<(title: string) => void>() },
  } as unknown as ExtensionContext;

  sessionName(pi);

  return {
    emit(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload, ctx);
      }
    },
    getSessionName: () => sessionNameValue,
  };
}

describe(normalizeSessionName, () => {
  test('uses only the final non-empty response line', () => {
    expect(
      normalizeSessionName(
        "I'll inspect the error mapping and its history\nShaka error classification"
      )
    ).toBe('Shaka error classification');
  });

  test.each([
    'One',
    'A title with rather more than four words',
    "Shaka's error mapping",
  ])(
    'preserves titles regardless of word count or punctuation: %s',
    (title) => {
      expect(normalizeSessionName(title)).toBe(title);
    }
  );

  test('truncates titles to 100 characters', () => {
    expect(normalizeSessionName('a'.repeat(100))).toBe('a'.repeat(100));
    expect(normalizeSessionName('a'.repeat(101))).toBe('a'.repeat(100));
    expect(normalizeSessionName(`${'a'.repeat(99)} bc`)).toBe('a'.repeat(99));
  });
});

describe('session name extension', () => {
  beforeEach(() => {
    agentSessionMocks.model.mockClear();
    agentSessionMocks.prompt.mockClear();
  });

  test('names a session from its first user message, not an assistant reply', async () => {
    const extension = setupExtension();
    extension.emit('session_start', {});
    extension.emit('message_start', {
      message: { role: 'user', content: 'Fix the Shaka error range' },
    });
    extension.emit('message_start', {
      message: { role: 'assistant', content: "I'll inspect the error mapping" },
    });

    await vi.waitFor(() => {
      expect(agentSessionMocks.prompt).toHaveBeenCalledExactlyOnceWith(
        'Fix the Shaka error range'
      );
      expect(agentSessionMocks.model).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cheap-input' })
      );
      expect(extension.getSessionName()).toBe('Error mapping review');
    });
  });

  test('includes raw skill input and appends the Git branch', async () => {
    const extension = setupExtension('feature/auth-errors');
    extension.emit('session_start', {});
    extension.emit('input', {
      text: '/skill:deslop src/auth.ts',
    });
    extension.emit('message_start', {
      message: {
        role: 'user',
        content: 'Check the requested target for AI-generated slop.',
      },
    });

    await vi.waitFor(() => {
      expect(agentSessionMocks.prompt).toHaveBeenCalledExactlyOnceWith(
        'User input before command expansion:\n' +
          '/skill:deslop src/auth.ts\n\n' +
          'Expanded task:\n' +
          'Check the requested target for AI-generated slop.'
      );
      expect(extension.getSessionName()).toBe(
        'Error mapping review on feature/auth-errors'
      );
    });
  });
});
