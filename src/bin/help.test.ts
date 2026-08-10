import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { getDocs } from '../util/help.ts';

const helpPath = path.join(import.meta.dirname, '../../bin/symlinks/help');

function renderHelp(command: string): string {
  return execFileSync(helpPath, [command], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

test('merges wrapped prose without flattening other Markdown blocks', () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, 'agent-comments.ts'),
    'utf8'
  );
  const docs = getDocs(source, 'agent-comments');

  expect(docs).toContain(
    '> Scans all non-binary files (respecting .gitignore) for comments that start with `AI:` in any common comment style and prints each one with its file and line number.'
  );
  expect(docs).toContain(
    '- Scan the current directory:\n\n`ai-comments`\n\n- Scan a specific directory:'
  );
});

test('renders source help as valid TLDR Markdown', () => {
  const branchDiffOutput = renderHelp('branch-diff');
  const agentCommentsOutput = renderHelp('agent-comments');

  expect(branchDiffOutput).toContain(
    'no argument prints either the feature branch'
  );
  expect(agentCommentsOutput).toContain('Scan the current directory');
  expect(agentCommentsOutput).toContain('ai-comments path/to/project');
});
