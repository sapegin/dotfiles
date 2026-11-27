import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
  ...oxfmt,
  ignorePatterns: [
    'ai/skills/_references/modern-web-guidance/*',
    'ai/skills/_references/react-best-practices/*',
    'hotdog/schemas/*',
    'obsidian-clipper/*',
    'obsidian/*',
    'pastor/schemas/*',
    'pi/agent/settings.json',
    'pretty-html/_assets/lib/*',
    'tilde/.config/zed/settings.json',
    'vscode/User/*/',
  ],
});
