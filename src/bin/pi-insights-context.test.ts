import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'pi-insights-context.ts');
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
  const modified = new Date(2026, 0, index + 1);
  fs.utimesSync(filePath, modified, modified);
  return filePath;
}

beforeAll(() => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-insights-'));
  sessionDirectory = path.join(tempDirectory, 'sessions');
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('pi-insights-context', () => {
  test('prints recent prior sessions without reasoning or sensitive payloads', () => {
    let currentSession = '';
    for (let index = 0; index < 7; index += 1) {
      const entries = [
        {
          type: 'session',
          version: 3,
          id: `session-${index}`,
          timestamp: `2026-01-0${index + 1}T00:00:00.000Z`,
          cwd: `/project/${index}`,
        },
        {
          type: 'message',
          id: `user-${index}`,
          parentId: null,
          message: { role: 'user', content: `request ${index}` },
        },
        {
          type: 'message',
          id: `assistant-${index}`,
          parentId: `user-${index}`,
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: `hidden reasoning ${index}` },
              { type: 'text', text: `answer ${index}` },
              ...Array.from({ length: 4 }, (_, blockIndex) => ({
                type: 'text',
                text: `verbose block ${blockIndex} ${'long output '.repeat(200)}`,
              })),
              {
                type: 'toolCall',
                name: 'bash',
                arguments: {
                  command: `PASSWORD=top-secret-${index} npm test`,
                },
              },
              ...Array.from({ length: 4 }, (_, blockIndex) => ({
                type: 'text',
                text: `trailing block ${blockIndex} ${'long output '.repeat(200)}`,
              })),
            ],
          },
        },
        {
          type: 'message',
          id: `result-${index}`,
          parentId: `assistant-${index}`,
          message: {
            role: 'toolResult',
            toolName: 'bash',
            isError: index === 6,
            content: [
              {
                type: 'text',
                text: `result ${index} ${'a'.repeat(400)}`,
              },
              {
                type: 'image',
                data: 'private-image-data',
                mimeType: 'image/png',
              },
            ],
          },
        },
      ];
      const filePath = writeSession('project', index, entries);
      if (index === 5) {
        currentSession = filePath;
      }
    }

    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PI_SESSION_FILE: currentSession,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Selected 6 most recently modified prior sessions.'
    );
    expect(result.stdout).toContain('request 6');
    expect(result.stdout).toContain('Tool calls: 1');
    expect(result.stdout).toContain('Tool errors: 1');
    expect(result.stdout).toContain('[Tool result: bash, success]');
    expect(result.stdout).toContain('request 0');
    expect(result.stdout).toContain('request 1');
    expect(result.stdout).not.toContain('request 5');
    expect(result.stdout).not.toContain('hidden reasoning');
    expect(result.stdout).not.toContain('private-image-data');
    expect(result.stdout).not.toContain('top-secret');
    expect(result.stdout).toContain('PASSWORD=[REDACTED]');
    expect(result.stdout).toContain('[image omitted]');
    expect(Buffer.byteLength(result.stdout)).toBeLessThan(50_000);
  });
});
