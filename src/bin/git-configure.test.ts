import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const dotfilesDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(import.meta.dirname, 'git-configure.ts');
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  DOTFILES_DIR: dotfilesDir,
};
let directory: string;
let repoRoot: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
}

function configure(cwd = repoRoot): void {
  execFileSync(process.execPath, [scriptPath], { cwd, env });
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'git-configure-'));
  repoRoot = path.join(directory, 'repo with spaces');
  fs.mkdirSync(repoRoot);
  git(repoRoot, 'init', '--initial-branch=main');
  git(repoRoot, 'config', 'user.name', 'Draft Test');
  git(repoRoot, 'config', 'user.email', 'draft@example.com');
  git(
    repoRoot,
    '-c',
    'commit.gpgSign=false',
    'commit',
    '--allow-empty',
    '-m',
    'Initial commit'
  );
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('commit draft configuration', () => {
  test('creates an untracked draft and preserves its contents on repeated setup', () => {
    configure();
    const draftPath = git(
      repoRoot,
      'rev-parse',
      '--path-format=absolute',
      '--git-path',
      'COMMIT_DRAFT'
    );
    expect(git(repoRoot, 'config', '--worktree', 'commit.template')).toBe(
      draftPath
    );
    expect(fs.readFileSync(draftPath, 'utf8')).toBe('');
    fs.writeFileSync(draftPath, 'Keep this draft\n');
    configure();
    expect(fs.readFileSync(draftPath, 'utf8')).toBe('Keep this draft\n');
    expect(git(repoRoot, 'status', '--porcelain')).toBe('');
  });

  test('restores a deleted draft on repeated setup', () => {
    configure();
    const draftPath = git(repoRoot, 'config', 'commit.template');
    fs.unlinkSync(draftPath);

    configure();

    expect(fs.readFileSync(draftPath, 'utf8')).toBe('');
    expect(git(repoRoot, 'config', 'commit.template')).toBe(draftPath);
  });

  test('preserves a draft created before configuration', () => {
    const draftPath = path.join(repoRoot, '.git/COMMIT_DRAFT');
    fs.writeFileSync(draftPath, 'Existing draft\n');
    configure();
    expect(fs.readFileSync(draftPath, 'utf8')).toBe('Existing draft\n');
  });

  test('leaves an existing template and repository configuration alone', () => {
    git(repoRoot, 'config', 'commit.template', '/existing/template');
    const configPath = path.join(repoRoot, '.git/config');
    const config = fs.readFileSync(configPath, 'utf8');
    configure();
    expect(fs.readFileSync(configPath, 'utf8')).toBe(config);
    expect(fs.existsSync(path.join(repoRoot, '.git/COMMIT_DRAFT'))).toBe(false);
  });

  test('configures separate drafts in linked worktrees', () => {
    configure();
    const mainDraft = git(repoRoot, 'config', 'commit.template');
    const worktree = path.join(directory, 'worktree');
    git(repoRoot, 'worktree', 'add', '-b', 'feature', worktree);
    configure(worktree);
    const worktreeDraft = git(worktree, 'config', 'commit.template');
    expect(worktreeDraft).not.toBe(mainDraft);
    expect(worktreeDraft).toBe(
      git(
        worktree,
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'COMMIT_DRAFT'
      )
    );
    fs.writeFileSync(worktreeDraft, 'Worktree draft\n');
    expect(fs.readFileSync(mainDraft, 'utf8')).toBe('');
    expect(git(repoRoot, 'config', 'commit.template')).toBe(mainDraft);

    fs.writeFileSync(mainDraft, 'Main draft\n');
    git(
      worktree,
      '-c',
      'commit.gpgSign=false',
      'commit',
      '--allow-empty',
      '-m',
      'Worktree change'
    );
    expect(fs.readFileSync(worktreeDraft, 'utf8')).toBe('');
    expect(fs.readFileSync(mainDraft, 'utf8')).toBe('Main draft\n');
  });

  test('can configure a linked worktree before the main worktree', () => {
    const worktree = path.join(directory, 'worktree');
    git(repoRoot, 'worktree', 'add', '-b', 'feature', worktree);
    configure(worktree);
    configure();
    expect(git(worktree, 'config', 'commit.template')).not.toBe(
      git(repoRoot, 'config', 'commit.template')
    );
    expect(git(repoRoot, 'rev-parse', '--is-inside-work-tree')).toBe('true');
  });

  test('migrates main-worktree settings before enabling worktree config', () => {
    git(repoRoot, 'config', 'core.worktree', repoRoot);
    configure();
    expect(git(repoRoot, 'config', '--worktree', 'core.worktree')).toBe(
      repoRoot
    );
    expect(git(repoRoot, 'config', '--worktree', 'core.bare')).toBe('false');
    expect(git(repoRoot, 'status', '--porcelain')).toBe('');
  });

  test('git loads the draft into its commit editor', () => {
    configure();
    const draftPath = git(repoRoot, 'config', 'commit.template');
    fs.writeFileSync(draftPath, 'Draft subject\n\nEssential rationale.\n');
    const editor = path.join(directory, 'editor');
    fs.writeFileSync(editor, '#!/bin/sh\nprintf "\\nReviewed.\\n" >> "$1"\n', {
      mode: 0o755,
    });
    git(
      repoRoot,
      '-c',
      `core.editor=${editor}`,
      '-c',
      'commit.gpgSign=false',
      'commit',
      '--allow-empty'
    );
    expect(git(repoRoot, 'log', '-1', '--format=%B')).toBe(
      'Draft subject\n\nEssential rationale.\n\nReviewed.'
    );
    expect(fs.readFileSync(draftPath, 'utf8')).toBe('');
  });

  test.each(['staged', 'unstaged', 'untracked'])(
    'clears the draft when %s changes remain after a partial commit',
    (pendingChange) => {
      fs.writeFileSync(path.join(repoRoot, 'committed.txt'), 'base\n');
      fs.writeFileSync(path.join(repoRoot, 'pending.txt'), 'base\n');
      git(repoRoot, 'add', '.');
      git(repoRoot, '-c', 'commit.gpgSign=false', 'commit', '-m', 'Base files');
      configure();
      const draftPath = git(repoRoot, 'config', 'commit.template');
      fs.writeFileSync(draftPath, 'Pending draft\n');
      fs.writeFileSync(path.join(repoRoot, 'committed.txt'), 'changed\n');
      if (pendingChange === 'untracked') {
        fs.writeFileSync(path.join(repoRoot, 'untracked.txt'), 'pending\n');
        git(repoRoot, 'config', 'status.showUntrackedFiles', 'no');
      } else {
        fs.writeFileSync(path.join(repoRoot, 'pending.txt'), 'pending\n');
        if (pendingChange === 'staged') {
          git(repoRoot, 'add', 'pending.txt');
        }
      }

      git(
        repoRoot,
        '-c',
        'commit.gpgSign=false',
        'commit',
        '-m',
        'Partial change',
        '--',
        'committed.txt'
      );

      expect(fs.readFileSync(draftPath, 'utf8')).toBe('');
      expect(
        git(repoRoot, 'status', '--porcelain', '--untracked-files=normal')
      ).not.toBe('');
    }
  );

  test('preserves autostashed pending changes during a rebase', () => {
    fs.writeFileSync(path.join(repoRoot, 'base.txt'), 'base\n');
    git(repoRoot, 'add', '.');
    git(repoRoot, '-c', 'commit.gpgSign=false', 'commit', '-m', 'Base file');
    git(repoRoot, 'branch', 'upstream');
    fs.writeFileSync(path.join(repoRoot, 'local.txt'), 'local\n');
    git(repoRoot, 'add', '.');
    git(repoRoot, '-c', 'commit.gpgSign=false', 'commit', '-m', 'Local change');
    git(repoRoot, 'switch', 'upstream');
    fs.writeFileSync(path.join(repoRoot, 'upstream.txt'), 'upstream\n');
    git(repoRoot, 'add', '.');
    git(
      repoRoot,
      '-c',
      'commit.gpgSign=false',
      'commit',
      '-m',
      'Upstream change'
    );
    git(repoRoot, 'switch', 'main');
    fs.writeFileSync(path.join(repoRoot, 'base.txt'), 'pending\n');
    configure();
    const draftPath = git(repoRoot, 'config', 'commit.template');
    fs.writeFileSync(draftPath, 'Pending draft\n');

    git(
      repoRoot,
      '-c',
      'commit.gpgSign=false',
      'rebase',
      '--autostash',
      'upstream'
    );

    expect(fs.readFileSync(draftPath, 'utf8')).toBe('Pending draft\n');
    expect(fs.readFileSync(path.join(repoRoot, 'base.txt'), 'utf8')).toBe(
      'pending\n'
    );
  });

  test('preserves the draft when a commit fails', () => {
    configure();
    const draftPath = git(repoRoot, 'config', 'commit.template');
    fs.writeFileSync(draftPath, 'Pending draft\n');
    git(repoRoot, 'config', 'hook.reject.command', 'exit 1');
    git(repoRoot, 'config', 'hook.reject.event', 'pre-commit');

    const result = spawnSync(
      'git',
      [
        '-c',
        'commit.gpgSign=false',
        'commit',
        '--allow-empty',
        '-m',
        'Rejected',
      ],
      { cwd: repoRoot, env, encoding: 'utf8' }
    );

    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(draftPath, 'utf8')).toBe('Pending draft\n');
  });

  test.each(['default', 'custom'])(
    'preserves configured hooks and the %s hook directory',
    (hookDirectory) => {
      const hooksPath =
        hookDirectory === 'default'
          ? path.join(repoRoot, '.git/hooks')
          : path.join(repoRoot, 'custom-hooks');
      const markerPath = path.join(directory, 'hook-output');
      fs.mkdirSync(hooksPath, { recursive: true });
      const hookPath = path.join(hooksPath, 'post-commit');
      const hook = `#!/bin/sh\nprintf 'traditional\\n' >> '${markerPath}'\n`;
      fs.writeFileSync(hookPath, hook, { mode: 0o755 });
      if (hookDirectory === 'custom') {
        git(repoRoot, 'config', 'core.hooksPath', hooksPath);
        fs.writeFileSync(path.join(repoRoot, '.gitignore'), '/custom-hooks/\n');
        git(repoRoot, 'add', '.gitignore');
      }
      git(
        repoRoot,
        'config',
        'hook.existing.command',
        `printf 'configured\\n' >> '${markerPath}'`
      );
      git(repoRoot, 'config', 'hook.existing.event', 'post-commit');
      configure();
      configure();
      const draftPath = git(repoRoot, 'config', 'commit.template');
      fs.writeFileSync(draftPath, 'Completed draft\n');

      git(
        repoRoot,
        '-c',
        'commit.gpgSign=false',
        'commit',
        '--allow-empty',
        '-m',
        'Completed change'
      );

      expect(fs.readFileSync(draftPath, 'utf8')).toBe('');
      expect(fs.readFileSync(hookPath, 'utf8')).toBe(hook);
      expect(fs.readFileSync(markerPath, 'utf8')).toBe(
        'configured\ntraditional\n'
      );
    }
  );

  test('does not clear a draft after switching to a custom template', () => {
    configure();
    const draftPath = git(repoRoot, 'config', 'commit.template');
    const customTemplate = path.join(repoRoot, '.git/OTHER_TEMPLATE');
    fs.writeFileSync(draftPath, 'Keep draft\n');
    fs.writeFileSync(customTemplate, 'Keep template\n');
    git(repoRoot, 'config', '--worktree', 'commit.template', customTemplate);

    git(
      repoRoot,
      '-c',
      'commit.gpgSign=false',
      'commit',
      '--allow-empty',
      '-m',
      'Custom message'
    );

    expect(fs.readFileSync(draftPath, 'utf8')).toBe('Keep draft\n');
    expect(fs.readFileSync(customTemplate, 'utf8')).toBe('Keep template\n');
  });

  test('pull initializes the draft before attempting to fetch', () => {
    git(
      repoRoot,
      'remote',
      'add',
      'origin',
      path.join(directory, 'missing.git')
    );
    const result = spawnSync(
      process.execPath,
      [path.join(import.meta.dirname, 'pull.ts')],
      { cwd: repoRoot, env, encoding: 'utf8' }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fatal:');
    expect(fs.existsSync(git(repoRoot, 'config', 'commit.template'))).toBe(
      true
    );
  });

  test('clone configures the new repository', () => {
    const target = path.join(directory, 'clone');
    execFileSync(
      'zsh',
      [
        '-f',
        '-c',
        'source "$DOTFILES_DIR/zsh/aliases.zsh"; clone "$1" "$2"',
        '--',
        repoRoot,
        target,
      ],
      { cwd: directory, env }
    );
    expect(fs.existsSync(git(target, 'config', 'commit.template'))).toBe(true);
    expect(git(target, 'status', '--porcelain')).toBe('');
  });

  test('a failed clone does not configure the current repository', () => {
    const result = spawnSync(
      'zsh',
      [
        '-f',
        '-c',
        'source "$DOTFILES_DIR/zsh/aliases.zsh"; clone "$1"',
        '--',
        path.join(directory, 'missing'),
      ],
      { cwd: repoRoot, env, encoding: 'utf8' }
    );
    expect(result.status).not.toBe(0);
    expect(fs.existsSync(path.join(repoRoot, '.git/COMMIT_DRAFT'))).toBe(false);
  });
});
