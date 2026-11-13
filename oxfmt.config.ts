import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
  ...oxfmt,
  ignorePatterns: [
    'ai/skills/_references/modern-web-guidance/*',
    'ai/skills/_references/react-best-practices/*',
    'obsidian-clipper/*',
    'obsidian/*',
    'pi/agent/settings.json',
    'pretty-html/_assets/lib/*',
    'vscode/User/*/',
  ],
});
