type Style = (value: string) => string;

const RESET = '\u001B[0m';
const BOLD = '\u001B[1m';
const DIM = '\u001B[2m';
const RED = '\u001B[31m';
const GREEN = '\u001B[32m';
const YELLOW = '\u001B[33m';
const CYAN = '\u001B[36m';

function style(open: string): Style {
  return (value) => `${open}${value}${RESET}`;
}

function compose(...styles: readonly Style[]): Style {
  return (value) =>
    styles.reduceRight((result, applyStyle) => applyStyle(result), value);
}

function logWithStyle(
  write: (...args: unknown[]) => void,
  format: (value: string) => string,
  ...args: readonly unknown[]
): void {
  if (args.length === 0) {
    write();
    return;
  }

  const [first, ...rest] = args;
  const message = typeof first === 'string' ? format(first) : first;

  write(message, ...rest);
}

const styles = {
  error: style(RED),
  warning: style(YELLOW),
  success: style(GREEN),
  info: style(CYAN),
  heading: compose(style(CYAN), style(BOLD)),
  strong: style(BOLD),
  muted: style(DIM),
};

export const log = {
  error(...args: Parameters<typeof console.error>): void {
    logWithStyle(console.error, styles.error, ...args);
  },
  warn(...args: Parameters<typeof console.warn>): void {
    logWithStyle(console.warn, styles.warning, ...args);
  },
  heading(...args: Parameters<typeof console.log>): void {
    logWithStyle(console.log, styles.heading, ...args);
  },
};

export const theme = {
  ...styles,
};
