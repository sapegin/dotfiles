import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
  ...oxfmt,
  ignorePatterns: [
    'vscode/*',
    'obsidian/*',
    'washingcode-book-master/*',
    'sapegin.me-master/*',
  ],
});
