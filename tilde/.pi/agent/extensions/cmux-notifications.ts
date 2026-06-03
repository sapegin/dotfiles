import { spawn } from 'node:child_process';
import { type ExtensionAPI } from '@earendil-works/pi-coding-agent';

/**
 * Minimal Cmux notifications: triggers `cmux notify` when the agent needs
 * input.
 */
export default function cmuxNotifications(pi: ExtensionAPI) {
  pi.on('agent_end', (_event, ctx) => {
    if (!ctx.hasUI) {
      return;
    }

    const child = spawn(
      'cmux',
      [
        'notify',
        '--title',
        'Agent',
        '--subtitle',
        'Waiting',
        '--body',
        'Agent needs input',
      ],
      { stdio: 'ignore' }
    );

    child.on('error', () => {});
    child.unref();
  });
}
