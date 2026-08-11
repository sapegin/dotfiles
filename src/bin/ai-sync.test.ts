import { describe, expect, test } from 'vitest';
import {
  collectReactBestPracticesIndexSections,
  collectWebGuideIndexSections,
} from './ai-sync.ts';

describe(collectReactBestPracticesIndexSections, () => {
  test('groups rules in the upstream section order', () => {
    const sections = [
      '## 1. Eliminating Waterfalls (async)',
      '',
      '## 2. Bundle Size Optimization (bundle)',
    ].join('\n');

    expect(
      collectReactBestPracticesIndexSections(
        [
          {
            relativePath: 'bundle-direct-imports.md',
            source: '---\ntitle: Use Direct Imports\n---\n',
          },
          {
            relativePath: 'async-parallel.md',
            source: '---\ntitle: Parallelize Independent Work\n---\n',
          },
        ],
        sections
      )
    ).toStrictEqual([
      {
        links: [
          {
            path: 'async-parallel.md',
            title: 'Parallelize Independent Work',
          },
        ],
        title: 'Eliminating Waterfalls',
      },
      {
        links: [
          { path: 'bundle-direct-imports.md', title: 'Use Direct Imports' },
        ],
        title: 'Bundle Size Optimization',
      },
    ]);
  });

  test('rejects rules whose prefix has no upstream section', () => {
    expect(() =>
      collectReactBestPracticesIndexSections(
        [{ relativePath: 'other-rule.md', source: 'title: Other Rule\n' }],
        '## 1. Eliminating Waterfalls (async)\n'
      )
    ).toThrow('React best-practice rules have unknown prefixes: other');
  });
});

describe(collectWebGuideIndexSections, () => {
  test('groups and sorts guides using their titles', () => {
    expect(
      collectWebGuideIndexSections([
        {
          relativePath: 'ui-atoms/position-aware-tooltips.md',
          source: '# Position-Aware Tooltips\n',
        },
        {
          relativePath: 'css/css-layout.md',
          source: '# CSS Layout\n',
        },
        {
          relativePath: 'css/animate-to-intrinsic-sizes.md',
          source: '# Animate to Intrinsic Sizes\n',
        },
      ])
    ).toStrictEqual([
      {
        links: [
          {
            path: 'css/animate-to-intrinsic-sizes.md',
            title: 'Animate to Intrinsic Sizes',
          },
          { path: 'css/css-layout.md', title: 'CSS Layout' },
        ],
        title: 'CSS',
      },
      {
        links: [
          {
            path: 'ui-atoms/position-aware-tooltips.md',
            title: 'Position-Aware Tooltips',
          },
        ],
        title: 'UI Atoms',
      },
    ]);
  });

  test('uses a formatted filename when a guide has no title', () => {
    const [section] = collectWebGuideIndexSections([
      {
        relativePath: 'css/missing-title.md',
        source: 'No title.\n',
      },
    ]);

    expect(section.links[0].title).toBe('Missing Title');
  });

  test('rejects guides outside a category', () => {
    expect(() =>
      collectWebGuideIndexSections([
        {
          relativePath: 'orphan.md',
          source: '# Orphan\n',
        },
      ])
    ).toThrow('orphan.md must be inside a category.');
  });
});
