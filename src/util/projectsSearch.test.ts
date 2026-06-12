import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  fuzzyfy,
  scoreProjectMatch,
  searchProjects,
} from './projectsSearch.ts';

describe(fuzzyfy, () => {
  test('inserts wildcards between alphanumeric characters', () => {
    expect(fuzzyfy('foo')).toBe('f.*o.*o');
  });
});

describe(scoreProjectMatch, () => {
  test('prefers abbreviation matches over fuzzy-only matches', () => {
    expect(scoreProjectMatch('raccoon-toolbox', 'rt')).toBeGreaterThan(
      scoreProjectMatch('react-group', 'rt') ?? 0
    );
  });

  test('matches without requiring the first letter', () => {
    expect(scoreProjectMatch('my-project', 'p')).not.toBeNull();
  });

  test('prefers shorter names among equally weighted matches', () => {
    expect(scoreProjectMatch('foo', 'foo')).toBeGreaterThan(
      scoreProjectMatch('foobar', 'foo') ?? 0
    );
  });

  test('matches folder names inside full paths', () => {
    expect(scoreProjectMatch('/Users/me/_/dg_stage_web', 'dw')).not.toBeNull();
  });
});

describe(searchProjects, () => {
  test('returns all projects when query is empty', () => {
    expect(searchProjects('').length).toBeGreaterThan(0);
  });

  test('filters projects by query', () => {
    expect(
      searchProjects('dotfiles').some((projectPath) =>
        projectPath.includes('dotfiles')
      )
    ).toBe(true);
  });

  test('finds dotfiles by name', () => {
    expect(searchProjects('dotfiles')[0]).toContain('dotfiles');
  });

  test('finds dg_stage_web by dw', () => {
    expect(
      searchProjects('dw').some(
        (projectPath) => path.basename(projectPath) === 'dg_stage_web'
      )
    ).toBe(true);
  });

  test('ranks raccoon-toolbox above react-group for rt', () => {
    const results = searchProjects('rt');
    const raccoonIndex = results.findIndex(
      (projectPath) => path.basename(projectPath) === 'raccoon-toolbox'
    );
    const reactIndex = results.findIndex(
      (projectPath) => path.basename(projectPath) === 'react-group'
    );

    expect(raccoonIndex).toBeGreaterThan(-1);
    expect(reactIndex).toBeGreaterThan(-1);
    expect(raccoonIndex).toBeLessThan(reactIndex);
  });
});
