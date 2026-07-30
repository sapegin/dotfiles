import { describe, expect, test } from 'vitest';
import {
  aggregateSessionStats,
  collectSessionStats,
} from './pi-sessions.ts';

describe(collectSessionStats, () => {
  test('counts messages, edits, writes, and session date', () => {
    const entries = [
      {
        type: 'session',
        timestamp: '2026-06-03T08:09:12.746Z',
        cwd: '/project',
      },
      {
        type: 'message',
        message: { role: 'user', content: 'hello' },
      },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'toolCall',
              name: 'write',
              arguments: {
                path: 'new.ts',
                content: 'one\ntwo\nthree',
              },
            },
            {
              type: 'toolCall',
              name: 'edit',
              arguments: {
                path: 'existing.ts',
                edits: [{ oldText: 'foo', newText: 'bar' }],
              },
            },
          ],
        },
      },
      {
        type: 'message',
        message: { role: 'toolResult', toolName: 'write', content: 'ok' },
      },
    ];

    expect(collectSessionStats(entries)).toStrictEqual({
      messages: 1,
      linesAdded: 4,
      linesRemoved: 1,
      filePaths: ['new.ts', 'existing.ts'],
      date: '2026-06-03',
    });
  });
});

describe(aggregateSessionStats, () => {
  test('aggregates totals and computes messages per day', () => {
    expect(
      aggregateSessionStats([
        {
          messages: 10,
          linesAdded: 5,
          linesRemoved: 2,
          filePaths: ['shared.ts', 'a.ts'],
          date: '2026-06-01',
        },
        {
          messages: 6,
          linesAdded: 3,
          linesRemoved: 1,
          filePaths: ['shared.ts', 'b.ts'],
          date: '2026-06-01',
        },
        {
          messages: 4,
          linesAdded: 1,
          linesRemoved: 0,
          filePaths: ['c.ts'],
          date: '2026-06-02',
        },
      ])
    ).toStrictEqual({
      sessions: 3,
      messages: 20,
      linesAdded: 9,
      linesRemoved: 3,
      filesChanged: 4,
      daysUsed: 2,
      messagesPerDay: 10,
    });
  });
});
