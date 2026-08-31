import { type ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const terminalMock = vi.hoisted(() => ({ writes: [] as string[] }));

// oxlint-disable-next-line unicorn/import-style -- Vitest uses dynamic imports for type-safe module mocks.
vi.mock(import('node:fs'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    default: {
      ...actual.default,
      closeSync: vi.fn<
        (fileDescriptor: number) => void
      >() as unknown as typeof actual.closeSync,
      openSync: vi.fn<(path: string, flags: string) => number>(
        () => 1
      ) as unknown as typeof actual.openSync,
      writeSync: vi.fn<
        (
          fileDescriptor: number,
          buffer: Uint8Array,
          offset: number,
          length: number
        ) => number
      >((_fileDescriptor, buffer, offset, length) => {
        terminalMock.writes.push(
          Buffer.from(buffer)
            .subarray(offset, offset + length)
            .toString('utf8')
        );
        return length;
      }) as unknown as typeof actual.writeSync,
    },
  };
});

import supacode from './supacode.ts';

type Handler = (...args: unknown[]) => unknown;

function setupExtension() {
  const eventHandlers = new Map<string, Handler[]>();
  const pi = {
    on(event: string, handler: Handler) {
      eventHandlers.set(event, [...(eventHandlers.get(event) ?? []), handler]);
    },
  } as unknown as ExtensionAPI;

  supacode(pi);
  terminalMock.writes.length = 0;

  return {
    emit(event: string) {
      for (const handler of eventHandlers.get(event) ?? []) {
        handler(undefined);
      }
    },
  };
}

describe('supacode extension', () => {
  beforeEach(() => {
    vi.stubEnv('SUPACODE_SURFACE_ID', 'surface-1');
    terminalMock.writes.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('requests attention when an extension UI prompt starts', () => {
    const extension = setupExtension();

    extension.emit('ui_prompt_start');

    expect(terminalMock.writes).toStrictEqual([
      '\u001B]9;Pi needs your input\u001B\\',
    ]);
  });
});
