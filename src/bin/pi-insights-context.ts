// Prints a compact, redacted transcript of the most recent prior Pi sessions
// for the pi-insights skill.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import path from 'node:path';
import {
  isObject,
  listSessionFiles,
  readSessionEntries,
  resolveSessionsDirectory,
  type JsonObject,
} from '../util/pi-sessions.ts';
import { run } from '../util/tui.ts';

const SESSION_COUNT = 10;
const MAX_BLOCK_LENGTH = 2000;
const MAX_SESSION_LENGTH = 8000;

interface TranscriptBlock {
  readonly text: string;
  readonly required: boolean;
}

// Session text may contain credentials in prompts, commands, and tool output.
// This is best-effort protection; callers must still treat the report as
// sensitive.
function redact(value: string): string {
  return value
    .replaceAll(
      /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g,
      '[REDACTED PRIVATE KEY]'
    )
    .replaceAll(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replaceAll(
      /((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,
      '$1[REDACTED]'
    )
    .replaceAll(/[A-Za-z\d+/=_-]{300,}/g, '[REDACTED LONG VALUE]');
}

function truncate(value: string, maximum = MAX_BLOCK_LENGTH): string {
  const clean = redact(value).replaceAll('\u0000', '');
  if (clean.length <= maximum) {
    return clean;
  }
  return `${clean.slice(0, maximum)}\n… [${clean.length - maximum} characters omitted]`;
}

function getTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((block) => {
      if (!isObject(block)) {
        return '';
      }
      if (block.type === 'text' && typeof block.text === 'string') {
        return block.text;
      }
      if (block.type === 'image') {
        return '[image omitted]';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

// Full edit and write payloads consume context without helping diagnose tool
// use; their target and size are enough for this report.
function summarizeArguments(toolName: string, value: unknown): string {
  if (!isObject(value)) {
    return truncate(JSON.stringify(value));
  }

  if (toolName === 'edit') {
    return JSON.stringify({
      path: value.path,
      edits: Array.isArray(value.edits) ? value.edits.length : undefined,
    });
  }
  if (toolName === 'write') {
    return JSON.stringify({
      path: value.path,
      contentLength:
        typeof value.content === 'string' ? value.content.length : undefined,
    });
  }

  return truncate(JSON.stringify(value));
}

function formatMessage(message: JsonObject): TranscriptBlock[] {
  const role = message.role;
  if (role === 'user') {
    return [
      {
        text: `[User]\n${truncate(getTextContent(message.content))}`,
        required: true,
      },
    ];
  }
  if (role === 'assistant') {
    if (!Array.isArray(message.content)) {
      return [];
    }

    const blocks: TranscriptBlock[] = [];
    for (const content of message.content) {
      if (!isObject(content)) {
        continue;
      }
      if (content.type === 'text' && typeof content.text === 'string') {
        blocks.push({
          text: `[Assistant]\n${truncate(content.text)}`,
          required: false,
        });
      } else if (
        content.type === 'toolCall' &&
        typeof content.name === 'string'
      ) {
        blocks.push({
          text: `[Tool call: ${content.name}]\n${summarizeArguments(content.name, content.arguments)}`,
          required: true,
        });
      }
    }
    return blocks;
  }
  if (role === 'toolResult') {
    const toolName =
      typeof message.toolName === 'string' ? message.toolName : 'unknown';
    const isError = message.isError === true;
    if (toolName === 'read' && !isError) {
      return [
        {
          text: '[Tool result: read, success]\n[content omitted]',
          required: true,
        },
      ];
    }

    const output = truncate(getTextContent(message.content));
    if (isError) {
      return [
        {
          text: `[Tool result: ${toolName}, error]\n${output}`,
          required: true,
        },
      ];
    }

    return [
      {
        text: `[Tool result: ${toolName}, success]`,
        required: true,
      },
      ...(output
        ? [
            {
              text: `[Tool output: ${toolName}]\n${output}`,
              required: false,
            },
          ]
        : []),
    ];
  }
  if (role === 'bashExecution') {
    const command = typeof message.command === 'string' ? message.command : '';
    const output = typeof message.output === 'string' ? message.output : '';
    return [
      {
        text: `[User shell command, exit ${String(message.exitCode)}]\n${truncate(command)}\n${truncate(output)}`,
        required: true,
      },
    ];
  }
  return [];
}

function shorten(value: string, maximum: number): string {
  if (value.length <= maximum) {
    return value;
  }
  return `${value.slice(0, Math.max(maximum - 1, 0))}…`;
}

// Commands, user feedback, and tool outcomes survive the budget. Assistant
// prose and successful output shrink first; required evidence may exceed the
// soft limit.
function fitTranscript(blocks: TranscriptBlock[]): string {
  const transcript = blocks.map(({ text }) => text).join('\n\n');
  if (transcript.length <= MAX_SESSION_LENGTH) {
    return transcript;
  }

  const requiredBlocks = blocks.filter(({ required }) => required);
  const requiredLength = requiredBlocks.reduce(
    (length, { text }) => length + text.length,
    0
  );
  const separatorLength = Math.max(blocks.length - 1, 0) * 2;
  const optionalBlocks = blocks.filter(({ required }) => !required);
  if (optionalBlocks.length === 0) {
    return transcript;
  }

  const optionalBudget = Math.floor(
    (MAX_SESSION_LENGTH - requiredLength - separatorLength) /
      optionalBlocks.length
  );

  if (optionalBudget < 40) {
    return requiredBlocks.map(({ text }) => text).join('\n\n');
  }

  return blocks
    .map(({ text, required }) =>
      required ? text : shorten(text, optionalBudget)
    )
    .join('\n\n');
}

function parseSession(filePath: string): string {
  const entries = readSessionEntries(filePath);

  const header = entries.find((entry) => entry.type === 'session');
  const sessionInfo = entries.findLast(
    (entry) => entry.type === 'session_info' && typeof entry.name === 'string'
  );
  const messages = entries.filter(
    (entry) => entry.type === 'message' && isObject(entry.message)
  );
  const toolCalls = messages.flatMap((entry) => {
    const message = entry.message as JsonObject;
    return message.role === 'assistant' && Array.isArray(message.content)
      ? message.content.filter(
          (content) =>
            isObject(content) &&
            content.type === 'toolCall' &&
            typeof content.name === 'string'
        )
      : [];
  });
  const toolErrors = messages.filter(
    (entry) =>
      (entry.message as JsonObject).role === 'toolResult' &&
      (entry.message as JsonObject).isError === true
  );

  // Include abandoned branches: failed approaches and recovery attempts are
  // useful evidence here even though Pi excludes them from the active
  // conversation branch.
  const transcript = entries.flatMap((entry) => {
    if (entry.type === 'message' && isObject(entry.message)) {
      return formatMessage(entry.message);
    }
    if (entry.type === 'compaction' && typeof entry.summary === 'string') {
      return [
        {
          text: `[Compaction summary]\n${truncate(entry.summary)}`,
          required: false,
        },
      ];
    }
    if (entry.type === 'branch_summary' && typeof entry.summary === 'string') {
      return [
        {
          text: `[Branch summary]\n${truncate(entry.summary)}`,
          required: false,
        },
      ];
    }
    return [];
  });

  const cwd = header && typeof header.cwd === 'string' ? header.cwd : 'unknown';
  const timestamp =
    header && typeof header.timestamp === 'string'
      ? header.timestamp
      : fs.statSync(filePath).mtime.toISOString();
  const name = sessionInfo?.name;
  const title = typeof name === 'string' ? ` — ${name}` : '';

  return [
    `## ${timestamp}${title}`,
    `- File: ${filePath}`,
    `- Working directory: ${cwd}`,
    `- User turns: ${messages.filter((entry) => (entry.message as JsonObject).role === 'user').length}`,
    `- Tool calls: ${toolCalls.length}`,
    `- Tool errors: ${toolErrors.length}`,
    '',
    fitTranscript(transcript),
  ].join('\n');
}

function main(): void {
  const currentSession = process.env.PI_SESSION_FILE;
  if (!currentSession) {
    throw new Error(
      'PI_SESSION_FILE is unavailable. Run pi-insights from a persistent Pi session.'
    );
  }

  const currentSessionPath = path.resolve(currentSession);
  const sessionDirectory = resolveSessionsDirectory();
  const sessionFiles = listSessionFiles(sessionDirectory)
    .filter((filePath) => path.resolve(filePath) !== currentSessionPath)
    .map((filePath) => ({ filePath, mtime: fs.statSync(filePath).mtimeMs }))
    .toSorted((left, right) => right.mtime - left.mtime)
    .slice(0, SESSION_COUNT);

  if (sessionFiles.length === 0) {
    throw new Error(`No prior Pi sessions found in ${sessionDirectory}`);
  }

  console.log(
    [
      '# Pi session evidence',
      `Selected ${sessionFiles.length} most recently modified prior sessions. Hidden reasoning and image data are omitted; likely credentials are redacted.`,
      ...sessionFiles.map(({ filePath }) => parseSession(filePath)),
    ].join('\n\n')
  );
}

await run(main);
