import { spawn } from 'node:child_process';
import { type ExtensionAPI } from '@earendil-works/pi-coding-agent';

function notify() {
  const child = spawn('cmux', ['notify'], { stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

/**
 * Minimal Cmux notifications: triggers `cmux notify` when the agent needs
 * input.
 */
export default function cmuxNotifications(pi: ExtensionAPI) {
  // Permission required
  pi.events.on('pi-permission-system:permission-request', (event) => {
    if ((event as { state?: unknown }).state === 'waiting') {
      notify();
    }
  });

  // End of agent turn
  pi.on('agent_end', (_event, ctx) => {
    if (ctx.hasUI) {
      notify();
    }
  });
}
