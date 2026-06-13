const RED = '\u001B[31m';
const YELLOW = '\u001B[33m';
const RESET = '\u001B[0m';

function logWithColor(
  write: typeof console.warn,
  color: string,
  ...args: Parameters<typeof console.warn>
) {
  if (args.length === 0) {
    write();
    return;
  }

  const [first, ...rest] = args;
  const message =
    typeof first === 'string' ? `${color}${first}${RESET}` : first;

  write(message, ...rest);
}

export function logWarn(...args: Parameters<typeof console.warn>) {
  logWithColor(console.warn, YELLOW, ...args);
}

export function logError(...args: Parameters<typeof console.error>) {
  logWithColor(console.warn, RED, ...args);
}
