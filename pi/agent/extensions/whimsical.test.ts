import {
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
  type WorkingIndicatorOptions,
} from '@earendil-works/pi-coding-agent';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Whimsical from './whimsical.ts';

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown;

function setupExtension() {
  const handlers = new Map<string, EventHandler>();
  const setWorkingIndicator =
    vi.fn<(options?: WorkingIndicatorOptions) => void>();
  const setWorkingMessage = vi.fn<(message?: string) => void>();
  const theme = {
    bold: (text: string) => `<bold>${text}</bold>`,
    fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
  } as Theme;
  const ctx = {
    ui: {
      setWorkingIndicator,
      setWorkingMessage,
      theme,
    },
  } as unknown as ExtensionContext;
  const pi = {
    on(event: string, handler: EventHandler) {
      handlers.set(event, handler);
    },
  } as unknown as ExtensionAPI;

  Whimsical(pi);

  return { ctx, handlers, setWorkingIndicator, setWorkingMessage };
}

function runHandler(
  handlers: ReadonlyMap<string, EventHandler>,
  event: string,
  ctx: ExtensionContext
): void {
  const handler = handlers.get(event);
  if (!handler) {
    throw new Error(`Missing ${event} handler`);
  }

  handler({}, ctx);
}

afterEach(() => {
  vi.useRealTimers();
});

describe(Whimsical, () => {
  test('installs the spinner and animates the working message', () => {
    vi.useFakeTimers();
    const { ctx, handlers, setWorkingIndicator, setWorkingMessage } =
      setupExtension();

    runHandler(handlers, 'turn_start', ctx);

    expect(setWorkingIndicator).toHaveBeenCalledWith({
      frames: [
        '<syntaxKeyword>·</syntaxKeyword>',
        '<syntaxKeyword>✻</syntaxKeyword>',
        '<syntaxKeyword>✽</syntaxKeyword>',
        '<syntaxKeyword>✶</syntaxKeyword>',
        '<syntaxKeyword>✳</syntaxKeyword>',
        '<syntaxKeyword>✢</syntaxKeyword>',
      ],
      intervalMs: 200,
    });
    const initialMessage = setWorkingMessage.mock.lastCall?.[0];

    vi.advanceTimersByTime(90);

    expect(setWorkingMessage).toHaveBeenCalledTimes(2);
    expect(setWorkingMessage.mock.lastCall?.[0]).not.toBe(initialMessage);
  });

  test.each(['turn_end', 'session_shutdown'])(
    '%s stops animation and restores the working UI',
    (event) => {
      vi.useFakeTimers();
      const { ctx, handlers, setWorkingIndicator, setWorkingMessage } =
        setupExtension();
      runHandler(handlers, 'turn_start', ctx);
      setWorkingIndicator.mockClear();
      setWorkingMessage.mockClear();

      runHandler(handlers, event, ctx);

      vi.advanceTimersByTime(1000);
      expect(setWorkingIndicator).toHaveBeenCalledExactlyOnceWith();
      expect(setWorkingMessage).toHaveBeenCalledExactlyOnceWith();
    }
  );
});
