import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'pi-stats.ts');
let tempDirectory: string;
let sessionDirectory: string;

function writeSession(
  project: string,
  index: number,
  entries: readonly object[]
): string {
  const projectDirectory = path.join(sessionDirectory, project);
  fs.mkdirSync(projectDirectory, { recursive: true });
  const filePath = path.join(projectDirectory, `session-${index}.jsonl`);
  fs.writeFileSync(
    filePath,
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`
  );
  return filePath;
}

beforeAll(() => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-stats-'));
  sessionDirectory = path.join(tempDirectory, 'sessions');
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('pi-stats', () => {
  test('prints aggregate stats for all sessions', () => {
    const currentSession = writeSession('project-a', 0, [
      {
        type: 'session',
        timestamp: '2026-06-01T10:00:00.000Z',
        cwd: '/project/a',
      },
      { type: 'message', message: { role: 'user', content: 'one' } },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'toolCall',
              name: 'write',
              arguments: { path: 'a.ts', content: 'alpha\nbeta' },
            },
          ],
        },
      },
    ]);
    writeSession('project-b', 1, [
      {
        type: 'session',
        timestamp: '2026-06-02T10:00:00.000Z',
        cwd: '/project/b',
      },
      { type: 'message', message: { role: 'user', content: 'two' } },
      { type: 'message', message: { role: 'assistant', content: 'done' } },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'toolCall',
              name: 'edit',
              arguments: {
                path: 'b.ts',
                edits: [{ oldText: 'old', newText: 'new' }],
              },
            },
          ],
        },
      },
    ]);

    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PI_SESSION_FILE: currentSession,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Sessions: 2');
    expect(result.stdout).toContain('Messages: 2');
    expect(result.stdout).toContain('Lines added: 3');
    expect(result.stdout).toContain('Lines removed: 1');
    expect(result.stdout).toContain('Files edited or created: 2');
    expect(result.stdout).toContain('Days used: 2');
    expect(result.stdout).toContain('Messages per day: 1');
  });
});
