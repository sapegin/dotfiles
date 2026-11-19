import { spawnSync } from 'node:child_process';

/** Capture command output while preserving diagnostics and failure exit codes. */
export function captureCommand(
  command: string,
  args: readonly string[],
  {
    cwd,
    env,
    acceptedExitCodes = [0],
  }: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    acceptedExitCodes?: readonly number[];
  } = {}
): { stdout: string; status: number } {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  process.stderr.write(result.stderr);
  if (
    result.status === null ||
    acceptedExitCodes.includes(result.status) === false
  ) {
    if (result.signal !== null) {
      console.error(`${command} terminated by ${result.signal}.`);
    } else if (result.stderr.trim() === '') {
      console.error(`${command} exited with status ${result.status}.`);
    }
    process.exit(result.status ?? 1);
  }
  return { stdout: result.stdout, status: result.status };
}
