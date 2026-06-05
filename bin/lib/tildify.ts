import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export function tildify(filepath: string) {
  return filepath.replace(os.homedir(), '~');
}

export function untildify(input: string): string {
  if (input === '~') {
    return HOME;
  }
  if (input.startsWith('~/')) {
    return path.join(HOME, input.slice(2));
  }
  return input;
}
