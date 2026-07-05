import { log } from './tui.ts';

interface RunMainOptions {
  /** Print a shared success message after `main()` finishes. */
  printDone?: boolean;
}

function getErrorStack(error: unknown): string {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

function isCtrlCAbort(error: unknown): boolean {
  // `readline/promises` throws this when the user presses Ctrl+C at a prompt.
  return (
    error instanceof Error &&
    error.name === 'AbortError' &&
    error.message === 'Aborted with Ctrl+C'
  );
}

export async function run(
  main: () => Promise<void>,
  options: RunMainOptions = {}
): Promise<void> {
  try {
    await main();
    if (options.printDone === true) {
      console.log('\nDone 🦆');
    }
  } catch (error) {
    // Ctrl+C is an intentional abort, so don't print a stack trace for it.
    if (isCtrlCAbort(error)) {
      process.exit(130);
    }

    console.log();
    log.error(getErrorStack(error));
    process.exit(1);
  }
}
