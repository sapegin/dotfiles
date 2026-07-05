import readline from 'node:readline/promises';
import { theme } from './tui.ts';

/** Ask a single interactive terminal question and close the readline handle. */
export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

/** Ask a yes/no question, using `defaultValue` for an empty answer. */
export async function confirmYesNo(
  question: string,
  defaultValue = false
): Promise<boolean> {
  const fullPrompt = `${theme.warning('?')} ${question} ${defaultValue ? '[Y/n]' : '[y/N]'} `;
  const response = await prompt(fullPrompt);
  const answer = response.trim().toLowerCase();
  if (answer === '') {
    return defaultValue;
  }
  return answer === 'y' || answer === 'yes';
}
