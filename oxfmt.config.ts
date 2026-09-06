import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
  ...oxfmt,
  ignorePatterns: [
    'ai/skills/_references/react-best-practices/*',
    'ai/skills/_references/modern-web-guidance/*',
    'obsidian/*',
    'obsidian-clipper/*',
    'pi/agent/settings.json',
    'pretty-html/_assets/lib/*',
    'supacode/settings.json',
    'vscode/User/*/',
  ],
});
