import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

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

afterEach(() => {
  fs.rmSync(sessionDirectory, { recursive: true, force: true });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('pi-insights-context', () => {
  test('preserves final replies and recorded command outcomes in long sessions', () => {
    const filePath = writeSession('long-session', 9, [
      {
        type: 'session',
        cwd: '/project',
        timestamp: '2026-01-10T00:00:00.000Z',
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        type: 'message',
        message: {
          role: 'user',
          content: `request ${index} ${'required context '.repeat(150)}`,
        },
      })),
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Routine status update' }],
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'codemode',
          isError: false,
          content: [{ type: 'text', text: 'Routine successful output' }],
          nestedCalls: {
            complete: false,
            calls: [
              {
                name: 'bash',
                arguments: { command: 'PASSWORD=command-secret npm test' },
                status: 'error',
                error: 'PASSWORD=nested-secret\nCommand exited with code 1',
              },
              {
                name: 'bash',
                arguments: { command: 'npm run lint' },
                status: 'ok',
              },
              { name: 'bash', status: 'unfinished', argumentsBytes: 9000 },
            ],
          },
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'bash',
          isError: false,
          content: [
            {
              type: 'text',
              text: `Tests started\n${'successful output\n'.repeat(400)}Tests: 12 passed`,
            },
          ],
        },
      },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `Final report\n${'explanation\n'.repeat(400)}`,
            },
            {
              type: 'text',
              text: 'PASSWORD=reply-secret\nVerification: lint passed; tests failed',
            },
          ],
        },
      },
    ]);
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PI_SESSION_FILE: path.join(path.dirname(filePath), 'current.jsonl'),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[Tool result: codemode, success]');
    expect(result.stdout).toContain('[Nested tool: bash, error]');
    expect(result.stdout).toContain('npm test');
    expect(result.stdout).toContain('Command exited with code 1');
    expect(result.stdout).toContain('[Nested tool: bash, ok]');
    expect(result.stdout).toContain('npm run lint');
    expect(result.stdout).toContain('[Nested tool: bash, unfinished]');
    expect(result.stdout).toContain('[arguments omitted from session]');
    expect(result.stdout).toContain('[Nested call record incomplete]');
    expect(result.stdout).toContain('Tests started');
    expect(result.stdout).toContain('Tests: 12 passed');
    expect(result.stdout).toContain('Final report');
    expect(result.stdout).toContain('Verification: lint passed; tests failed');
    expect(result.stdout).toContain('characters omitted');
    expect(result.stdout).toContain('[Evidence omitted: 2 optional blocks');
    expect(result.stdout).not.toContain('Routine status update');
    expect(result.stdout).not.toContain('Routine successful output');
    expect(result.stdout).not.toContain('command-secret');
    expect(result.stdout).not.toContain('nested-secret');
    expect(result.stdout).not.toContain('reply-secret');
    expect(result.stdout).toContain('PASSWORD=[REDACTED]');
    const reply = result.stdout
      .split('[Assistant]\n')[1]
      .split('\n\n[Evidence omitted:')[0];
    expect(reply.length).toBeLessThan(2100);
    fs.rmSync(filePath);
  });

  test('reports unavailable nested evidence without inferring command success', () => {
    const filePath = writeSession('legacy-codemode', 8, [
      { type: 'session', cwd: '/project' },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'codemode',
          isError: false,
          content: [{ type: 'text', text: 'Script completed' }],
        },
      },
    ]);
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PI_SESSION_FILE: path.join(path.dirname(filePath), 'current.jsonl'),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[Nested call evidence unavailable');
    expect(result.stdout).not.toContain('[Nested tool: bash, ok]');
    fs.rmSync(filePath);
  });

  test('retains the start and assertion at the end of long redacted errors', () => {
    const filePath = writeSession('long-error', 8, [
      {
        type: 'session',
        cwd: '/project',
        timestamp: '2026-01-09T00:00:00.000Z',
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolName: 'bash',
          isError: true,
          content: [
            {
              type: 'text',
              text: `Cypress runner banner\n${'startup output\n'.repeat(400)}PASSWORD=private-value\nAssertionError: expected announcement to be visible`,
            },
          ],
        },
      },
    ]);
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PI_SESSION_FILE: path.join(path.dirname(filePath), 'current.jsonl'),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Cypress runner banner');
    expect(result.stdout).toContain('characters omitted');
    expect(result.stdout).toContain(
      'AssertionError: expected announcement to be visible'
    );
    expect(result.stdout).toContain('PASSWORD=[REDACTED]');
    expect(result.stdout).not.toContain('private-value');
    const error = result.stdout
      .split('[Tool result: bash, error]\n')[1]
      .split('\n\n## ')[0];
    expect(error.length).toBeLessThan(2100);
    fs.rmSync(filePath);
  });

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
