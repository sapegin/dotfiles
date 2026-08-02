import { describe, expect, test } from 'vitest';
import { getEntryCost } from '../../pi/agent/extensions/pretty.ts';
import { aggregateSessionStats, collectSessionStats } from './pi-sessions.ts';

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
          usage: { cost: { total: 1.25 } },
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'write',
          content: 'ok',
          usage: { cost: { total: 0.5 } },
        },
      },
      { type: 'branch_summary', usage: { cost: { total: 0.25 } } },
    ];

    expect(collectSessionStats(entries)).toStrictEqual({
      messages: 1,
      toolCalls: 2,
      toolErrors: 0,
      linesAdded: 4,
      linesRemoved: 1,
      filePaths: ['new.ts', 'existing.ts'],
      cost: 2,
      cwd: '/project',
      date: '2026-06-03',
    });
  });

  test('counts tool errors', () => {
    const entries = [
      {
        type: 'session',
        timestamp: '2026-06-03T08:09:12.746Z',
        cwd: '/project',
      },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [{ type: 'toolCall', name: 'bash', arguments: {} }],
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'bash',
          isError: true,
          content: 'failed',
        },
      },
    ];

    expect(collectSessionStats(entries).toolErrors).toBe(1);
  });
});

describe(getEntryCost, () => {
  test('sums assistant, tool, and summary entry costs', () => {
    expect(
      getEntryCost({
        type: 'message',
        message: { role: 'assistant', usage: { cost: { total: 1 } } },
      })
    ).toBe(1);
    expect(
      getEntryCost({
        type: 'message',
        message: { role: 'toolResult', usage: { cost: { total: 2 } } },
      })
    ).toBe(2);
    expect(
      getEntryCost({
        type: 'branch_summary',
        usage: { cost: { total: 3 } },
      })
    ).toBe(3);
    expect(
      getEntryCost({
        type: 'compaction',
        usage: { cost: { total: 4 } },
      })
    ).toBe(4);
  });
});

describe(aggregateSessionStats, () => {
  test('aggregates totals and computes messages per day', () => {
    expect(
      aggregateSessionStats([
        {
          messages: 10,
          toolCalls: 20,
          toolErrors: 1,
          linesAdded: 5,
          linesRemoved: 2,
          filePaths: ['shared.ts', 'a.ts'],
          cost: 3,
          cwd: '/project/a',
          date: '2026-06-01',
        },
        {
          messages: 6,
          toolCalls: 12,
          toolErrors: 0,
          linesAdded: 3,
          linesRemoved: 1,
          filePaths: ['shared.ts', 'b.ts'],
          cost: 2,
          cwd: '/project/a',
          date: '2026-06-01',
        },
        {
          messages: 4,
          toolCalls: 8,
          toolErrors: 2,
          linesAdded: 1,
          linesRemoved: 0,
          filePaths: ['c.ts'],
          cost: 1,
          cwd: '/project/b',
          date: '2026-06-02',
        },
      ])
    ).toStrictEqual({
      sessions: 3,
      projects: 2,
      messages: 20,
      toolCalls: 40,
      toolErrors: 3,
      linesAdded: 9,
      linesRemoved: 3,
      filesChanged: 4,
      firstDate: '2026-06-01',
      daysUsed: 2,
      messagesPerDay: 10,
      totalCost: 6,
      costPerDay: 3,
      costPerMessage: 0.3,
    });
  });
});
