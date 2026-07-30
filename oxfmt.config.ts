import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
  ...oxfmt,
  ignorePatterns: [
    'ai/skills/modern-web-guidance/guides/*',
    'obsidian/*',
    'pretty-html/_assets/lib/*',
    'supacode/settings.json',
    'vscode/User/*/',
  ],
});
