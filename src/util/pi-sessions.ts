import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// Pi extensions are symlinked into ~/.pi/agent and cannot import from src/, so
// session stats reuse the line-count helpers from pretty.ts instead of the
// other way around.
import {
  countLines,
  getLineDiffStats,
  type DiffStats,
} from '../../pi/agent/extensions/pretty.ts';

export type JsonObject = Record<string, unknown>;

export interface SessionStats {
  readonly messages: number;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly filePaths: readonly string[];
  readonly date?: string;
}

export interface AggregateStats {
  readonly sessions: number;
  readonly messages: number;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly filesChanged: number;
  readonly daysUsed: number;
  readonly messagesPerDay: number;
}

/** Type guard for JSON objects parsed from Pi session entries. */
export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read and parse all entries from a Pi session JSONL file. */
export function readSessionEntries(filePath: string): JsonObject[] {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  return lines.map((line, index) => {
    try {
      const value: unknown = JSON.parse(line);
      if (!isObject(value)) {
        throw new Error('entry is not an object');
      }
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${filePath}:${index + 1}: ${message}`);
    }
  });
}

function getSessionDate(entries: readonly JsonObject[]): string | undefined {
  const header = entries.find((entry) => entry.type === 'session');
  if (header && typeof header.timestamp === 'string') {
    return header.timestamp.slice(0, 10);
  }
  return undefined;
}

function collectEditStats(argumentsValue: unknown): DiffStats {
  if (!isObject(argumentsValue) || !Array.isArray(argumentsValue.edits)) {
    return { added: 0, removed: 0 };
  }

  return argumentsValue.edits.reduce<DiffStats>(
    (totals, edit) => {
      if (!isObject(edit)) {
        return totals;
      }
      const oldText = typeof edit.oldText === 'string' ? edit.oldText : '';
      const newText = typeof edit.newText === 'string' ? edit.newText : '';
      const stats = getLineDiffStats(oldText, newText);
      return {
        added: totals.added + stats.added,
        removed: totals.removed + stats.removed,
      };
    },
    { added: 0, removed: 0 }
  );
}

function collectWriteStats(argumentsValue: unknown): DiffStats {
  if (!isObject(argumentsValue) || typeof argumentsValue.content !== 'string') {
    return { added: 0, removed: 0 };
  }

  return { added: countLines(argumentsValue.content), removed: 0 };
}

/** Aggregate usage stats from parsed session entries. */
export function collectSessionStats(
  entries: readonly JsonObject[]
): SessionStats {
  let linesAdded = 0;
  let linesRemoved = 0;
  const filePaths = new Set<string>();

  for (const entry of entries) {
    if (entry.type !== 'message' || !isObject(entry.message)) {
      continue;
    }

    const message = entry.message;
    if (message.role !== 'assistant' || !Array.isArray(message.content)) {
      continue;
    }

    for (const content of message.content) {
      if (
        !isObject(content) ||
        content.type !== 'toolCall' ||
        typeof content.name !== 'string'
      ) {
        continue;
      }

      if (content.name === 'edit' || content.name === 'write') {
        if (
          isObject(content.arguments) &&
          typeof content.arguments.path === 'string'
        ) {
          filePaths.add(content.arguments.path);
        }

        const stats =
          content.name === 'edit'
            ? collectEditStats(content.arguments)
            : collectWriteStats(content.arguments);
        linesAdded += stats.added;
        linesRemoved += stats.removed;
      }
    }
  }

  return {
    messages: entries.filter(
      (entry) =>
        entry.type === 'message' &&
        isObject(entry.message) &&
        entry.message.role === 'user'
    ).length,
    linesAdded,
    linesRemoved,
    filePaths: [...filePaths],
    date: getSessionDate(entries),
  };
}

/** Combine per-session stats into repository-wide totals. */
export function aggregateSessionStats(
  sessionStats: readonly SessionStats[]
): AggregateStats {
  const filePaths = new Set<string>();
  const totals = sessionStats.reduce(
    (summary, stats) => {
      for (const filePath of stats.filePaths) {
        filePaths.add(filePath);
      }
      return {
        messages: summary.messages + stats.messages,
        linesAdded: summary.linesAdded + stats.linesAdded,
        linesRemoved: summary.linesRemoved + stats.linesRemoved,
      };
    },
    {
      messages: 0,
      linesAdded: 0,
      linesRemoved: 0,
    }
  );

  const daysUsed = new Set(
    sessionStats.flatMap((stats) =>
      stats.date === undefined ? [] : [stats.date]
    )
  ).size;
  const messagesPerDay =
    daysUsed === 0 ? 0 : Math.round((totals.messages / daysUsed) * 10) / 10;

  return {
    sessions: sessionStats.length,
    ...totals,
    filesChanged: filePaths.size,
    daysUsed,
    messagesPerDay,
  };
}

/**
 * Resolve the Pi sessions root directory. Uses `PI_SESSION_FILE` when set;
 * otherwise defaults to `~/.pi/agent/sessions`.
 */
export function resolveSessionsDirectory(): string {
  const currentSession = process.env.PI_SESSION_FILE;
  if (currentSession) {
    return path.dirname(path.dirname(path.resolve(currentSession)));
  }

  return path.join(os.homedir(), '.pi', 'agent', 'sessions');
}

/** List every Pi session JSONL file under a sessions root directory. */
export function listSessionFiles(sessionDirectory: string): string[] {
  if (!fs.existsSync(sessionDirectory)) {
    throw new Error(`Pi session directory does not exist: ${sessionDirectory}`);
  }

  return fs
    .readdirSync(sessionDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}
