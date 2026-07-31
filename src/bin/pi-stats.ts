// Prints aggregate usage stats across all Pi sessions.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import {
  aggregateSessionStats,
  collectSessionStats,
  listSessionFiles,
  readSessionEntries,
  resolveSessionsDirectory,
} from '../util/pi-sessions.ts';
import { run } from '../util/tui.ts';

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDaysUsed(daysUsed: number, firstDate?: string): string {
  const days = formatNumber(daysUsed);
  return firstDate === undefined ? days : `${days} (since ${firstDate})`;
}

function formatToolCalls(toolCalls: number, toolErrors: number): string {
  if (toolErrors === 0) {
    return formatNumber(toolCalls);
  }
  const errorRate =
    toolCalls === 0
      ? 0
      : Math.round((toolErrors / toolCalls) * 1000) / 10;
  return `${formatNumber(toolCalls)} (${formatNumber(toolErrors)} errors, ${errorRate}%)`;
}

function main(): void {
  const sessionsDirectory = resolveSessionsDirectory();
  const sessionFiles = listSessionFiles(sessionsDirectory);
  if (sessionFiles.length === 0) {
    throw new Error(`No Pi sessions found in ${sessionsDirectory}`);
  }

  const stats = aggregateSessionStats(
    sessionFiles.map((filePath) =>
      collectSessionStats(readSessionEntries(filePath))
    )
  );

  console.log(`Sessions: ${formatNumber(stats.sessions)}`);
  console.log(`Projects: ${formatNumber(stats.projects)}`);
  console.log(`Messages: ${formatNumber(stats.messages)}`);
  console.log(`Tool calls: ${formatToolCalls(stats.toolCalls, stats.toolErrors)}`);
  console.log(`Lines added: ${formatNumber(stats.linesAdded)}`);
  console.log(`Lines removed: ${formatNumber(stats.linesRemoved)}`);
  console.log(`Files edited or created: ${formatNumber(stats.filesChanged)}`);
  console.log(`Days used: ${formatDaysUsed(stats.daysUsed, stats.firstDate)}`);
  console.log(`Messages per day: ${formatNumber(stats.messagesPerDay)}`);
  console.log(`Total spent: ${formatMoney(stats.totalCost)}`);
  console.log(`Daily average: ${formatMoney(stats.costPerDay)}`);
  console.log(`Cost per message: ${formatMoney(stats.costPerMessage)}`);
}

await run(main);
