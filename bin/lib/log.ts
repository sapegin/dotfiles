const RED = '\u001B[31m';
const ORANGE = '\u001B[38;5;208m';
const RESET = '\u001B[0m';

export function logWarn(text: string) {
  console.warn(`${ORANGE}${text}${RESET}`);
}

export function logError(text: string) {
  console.warn(`${RED}${text}${RESET}`);
}
