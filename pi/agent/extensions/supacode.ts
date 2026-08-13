/**
 * Supacode + Pi integration extension.
 *
 * Reports agent lifecycle to Supacode with OSC 3008 and requests attention with
 * a generic OSC 9 terminal notification. The sequences are inert in any
 * terminal that does not handle them, and reach Supacode over SSH too (no local
 * socket needed), matching the notification channel used by terminal agents.
 *
 * Required env var (injected automatically by Supacode on every surface):
 * SUPACODE_SURFACE_ID  present only on a Supacode surface; absence is the
 * no-op gate. Signals are unauthenticated.
 * Optional:
 * SUPACODE_SOCKET_PATH  present only on the local host; gates the local pid
 * so the app's liveness sweep can reap a crashed agent.
 *
 * Hook event mapping:
 * extension load      -> session_start  (agent presence badge)
 * Pi agent_start      -> busy
 * Pi agent_settled    -> idle + generic input-needed notification
 * permission request  -> generic input-needed notification
 * Pi session_shutdown -> session_end + idle (defensive activity reset)
 */

import nodeFs from 'node:fs';
import { type ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { permissionRequiredEvent } from './block-destructive-operations.ts';

const AGENT = 'pi';

let lastWarnedAt = 0;
const WARN_INTERVAL_MS = 60_000;

function isSupacodeSurface(): boolean {
  const id = process.env['SUPACODE_SURFACE_ID'] ?? '';
  return Boolean(id) && id.length > 0;
}

/**
 * The agent's local process id as an OSC pid suffix, but only on the local
 * host (SUPACODE_SOCKET_PATH is set). A remote pid over SSH would be
 * meaningless to the app's liveness sweep, so it is omitted there.
 */
function localPidSuffix(): string {
  return process.env['SUPACODE_SOCKET_PATH'] ? `;pid=${process.pid}` : '';
}

/**
 * Writes an OSC sequence to the controlling terminal. The extension runs
 * inside the Pi TUI process, which owns the terminal, so /dev/tty resolves.
 * Best-effort, but a systematically-failing tty is logged at most once per
 * `WARN_INTERVAL_MS` to stderr so a broken write path is distinguishable
 * from "not a Supacode surface" without spamming the log on every emit.
 */
function writeToTerminal(sequence: string): void {
  try {
    const fd = nodeFs.openSync('/dev/tty', 'w');
    try {
      // Loop until the full byte length lands: a short write would leave a
      // half OSC 3008 with no ST (ESC\) and corrupt the terminal parser.
      const bytes = Buffer.from(sequence, 'utf8');
      let offset = 0;
      while (offset < bytes.length) {
        try {
          const written = nodeFs.writeSync(
            fd,
            bytes,
            offset,
            bytes.length - offset
          );
          if (written <= 0) {
            throw new Error(`short write (${offset}/${bytes.length} bytes)`);
          }
          offset += written;
        } catch (error) {
          // Retry interrupted / non-blocking transient errors; abort on anything else.
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'EINTR' || code === 'EAGAIN') {
            continue;
          }
          throw error;
        }
      }
    } finally {
      nodeFs.closeSync(fd);
    }
  } catch (error) {
    const now = Date.now();
    if (now - lastWarnedAt > WARN_INTERVAL_MS) {
      lastWarnedAt = now;
      const e = error as NodeJS.ErrnoException;
      const code = e.code ?? '';
      const errno = e.errno ?? '';
      const message = e.message;
      process.stderr.write(
        `supacode: OSC emit failed: code=${code} errno=${errno} message=${message}\n`
      );
    }
  }
}

function emitPresence(event: string): void {
  const action = event === 'session_end' ? 'end' : 'start';
  const meta = `event=${event}${localPidSuffix()}`;
  writeToTerminal(`\u001B]3008;${action}=${AGENT};${meta}\u001B\\`);
}

function emitInputNeededNotification(): void {
  writeToTerminal(`\u001B]9;Pi needs your input\u001B\\`);
}

export default function supacode(pi: ExtensionAPI) {
  // Not running under Supacode, or not a Supacode surface: stay inert.
  if (!isSupacodeSurface()) {
    return;
  }

  // Extension load = agent process running. Pi has no equivalent of
  // Claude's SessionStart hook, so we fire it ourselves.
  emitPresence('session_start');

  pi.on('agent_start', (_event, _ctx) => {
    emitPresence('busy');
  });

  pi.on('agent_settled', (_event, _ctx) => {
    // Wait until retries, compaction, and queued continuations have finished;
    // only then is Pi actually waiting for the user's next input.
    emitPresence('idle');
    emitInputNeededNotification();
  });

  pi.events.on(permissionRequiredEvent, () => {
    emitInputNeededNotification();
  });

  pi.on('session_shutdown', (_event, _ctx) => {
    emitPresence('session_end');
    emitPresence('idle');
  });
}
