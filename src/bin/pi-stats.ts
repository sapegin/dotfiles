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
  console.log(`Messages: ${formatNumber(stats.messages)}`);
  console.log(`Lines added: ${formatNumber(stats.linesAdded)}`);
  console.log(`Lines removed: ${formatNumber(stats.linesRemoved)}`);
  console.log(`Files edited or created: ${formatNumber(stats.filesChanged)}`);
  console.log(`Days used: ${formatNumber(stats.daysUsed)}`);
  console.log(`Messages per day: ${formatNumber(stats.messagesPerDay)}`);
}

await run(main);
