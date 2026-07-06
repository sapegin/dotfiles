import readline from 'node:readline';

type Style = (value: string) => string;

interface ProgressOptions {
  readonly total: number;
  readonly width?: number;
}

interface Progress {
  update(current: number, message: string): void;
  error(message: string): void;
  done(): void;
}

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

function renderProgressBar(
  current: number,
  total: number,
  width: number
): string {
  const ratio = total === 0 ? 1 : Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
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

export function createProgress({
  total,
  width = 50,
}: ProgressOptions): Progress {
  const stream = process.stdout;
  let rendered = false;

  function update(current: number, message: string): void {
    if (stream.isTTY !== true) {
      console.log(`${message} (${current}/${total})`);
      return;
    }

    if (rendered) {
      readline.moveCursor(stream, 0, -2);
    }

    readline.clearLine(stream, 0);
    readline.cursorTo(stream, 0);
    stream.write(
      `${String(current).padStart(String(total).length)}/${total}  ${renderProgressBar(
        current,
        total,
        width
      )}\n`
    );
    readline.clearLine(stream, 0);
    readline.cursorTo(stream, 0);
    stream.write(`\n${message}\n`);
    rendered = true;
  }

  function error(message: string): void {
    if (rendered && stream.isTTY === true) {
      done();
    }
    log.error(message);
  }

  function done(): void {
    rendered = false;
  }

  return { update, error, done };
}
