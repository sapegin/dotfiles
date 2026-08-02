import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// Pi extensions are symlinked into ~/.pi/agent and cannot import from src/, so
// session stats reuse the line-count helpers from pretty.ts instead of the
// other way around.
import {
  countLines,
  getEntryCost,
  getLineDiffStats,
  type DiffStats,
} from '../../pi/agent/extensions/pretty.ts';

export type JsonObject = Record<string, unknown>;

interface UsageCounters {
  readonly messages: number;
  readonly toolCalls: number;
  readonly toolErrors: number;
  readonly linesAdded: number;
  readonly linesRemoved: number;
}

export interface SessionStats extends UsageCounters {
  readonly filePaths: readonly string[];
  readonly cost: number;
  readonly cwd?: string;
  readonly date?: string;
}

export interface AggregateStats extends UsageCounters {
  readonly sessions: number;
  readonly projects: number;
  readonly filesChanged: number;
  readonly firstDate?: string;
  readonly daysUsed: number;
  readonly messagesPerDay: number;
  readonly totalCost: number;
  readonly costPerDay: number;
  readonly costPerMessage: number;
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

function getSessionHeader(
  entries: readonly JsonObject[]
): JsonObject | undefined {
  const header = entries.find((entry) => entry.type === 'session');
  return header;
}

function getSessionDate(entries: readonly JsonObject[]): string | undefined {
  const header = getSessionHeader(entries);
  if (header && typeof header.timestamp === 'string') {
    return header.timestamp.slice(0, 10);
  }
  return undefined;
}

function getSessionCwd(entries: readonly JsonObject[]): string | undefined {
  const header = getSessionHeader(entries);
  return header && typeof header.cwd === 'string' ? header.cwd : undefined;
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
  let toolCalls = 0;
  let toolErrors = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  let cost = 0;
  const filePaths = new Set<string>();

  for (const entry of entries) {
    cost += getEntryCost(entry);

    if (entry.type !== 'message' || !isObject(entry.message)) {
      continue;
    }
    const message = entry.message;

    if (message.role === 'toolResult') {
      if (message.isError === true) {
        toolErrors += 1;
      }
      continue;
    }

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

      toolCalls += 1;

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
    toolCalls,
    toolErrors,
    linesAdded,
    linesRemoved,
    filePaths: [...filePaths],
    cost,
    cwd: getSessionCwd(entries),
    date: getSessionDate(entries),
  };
}

/** Combine per-session stats into repository-wide totals. */
export function aggregateSessionStats(
  sessionStats: readonly SessionStats[]
): AggregateStats {
  const filePaths = new Set<string>();
  const projectPaths = new Set<string>();
  const totals = sessionStats.reduce(
    (summary, stats) => {
      for (const filePath of stats.filePaths) {
        filePaths.add(filePath);
      }
      if (stats.cwd !== undefined) {
        projectPaths.add(stats.cwd);
      }
      return {
        messages: summary.messages + stats.messages,
        toolCalls: summary.toolCalls + stats.toolCalls,
        toolErrors: summary.toolErrors + stats.toolErrors,
        linesAdded: summary.linesAdded + stats.linesAdded,
        linesRemoved: summary.linesRemoved + stats.linesRemoved,
        totalCost: summary.totalCost + stats.cost,
      };
    },
    {
      messages: 0,
      toolCalls: 0,
      toolErrors: 0,
      linesAdded: 0,
      linesRemoved: 0,
      totalCost: 0,
    }
  );

  const dates = sessionStats
    .flatMap((stats) => (stats.date === undefined ? [] : [stats.date]))
    .toSorted();
  const daysUsed = new Set(dates).size;
  const messagesPerDay =
    daysUsed === 0 ? 0 : Math.round((totals.messages / daysUsed) * 10) / 10;
  const costPerDay =
    daysUsed === 0 ? 0 : Math.round((totals.totalCost / daysUsed) * 100) / 100;
  const costPerMessage =
    totals.messages === 0
      ? 0
      : Math.round((totals.totalCost / totals.messages) * 100) / 100;

  return {
    sessions: sessionStats.length,
    projects: projectPaths.size,
    messages: totals.messages,
    toolCalls: totals.toolCalls,
    toolErrors: totals.toolErrors,
    linesAdded: totals.linesAdded,
    linesRemoved: totals.linesRemoved,
    filesChanged: filePaths.size,
    firstDate: dates[0],
    daysUsed,
    messagesPerDay,
    totalCost: totals.totalCost,
    costPerDay,
    costPerMessage,
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
