import { describe, expect, test } from 'vitest';
import { generatePersonaSections, parsePersona } from './util/ai.ts';

const personas = new Map([
  ['ramsay', 'Be exact.\nBe severe.'],
  ['poe', 'Be restrained.'],
]);

describe(parsePersona, () => {
  test('extracts instructions after the identifying heading', () => {
    expect(parsePersona('# poe\n\nBe restrained.\n', 'poe')).toBe(
      'Be restrained.'
    );
  });

  test('rejects a mismatched persona heading', () => {
    expect(() => parsePersona('# ramsay\n\nBe severe.\n', 'poe')).toThrow(
      'Persona poe must start with "# poe".'
    );
  });
});

describe(generatePersonaSections, () => {
  test('replaces only the contents of a persona element', () => {
    const source = [
      '# Skill',
      '',
      '## Tone',
      '',
      '<persona name="ramsay">',
      '',
      'Stale instructions.',
      '',
      '</persona>',
      '',
      'Keep this tone note.',
      '',
      '## Process',
      '',
      'Keep this process.',
      '',
    ].join('\n');

    expect(generatePersonaSections(source, personas)).toBe(
      [
        '# Skill',
        '',
        '## Tone',
        '',
        '<persona name="ramsay">',
        'Be exact.',
        'Be severe.',
        '</persona>',
        '',
        'Keep this tone note.',
        '',
        '## Process',
        '',
        'Keep this process.',
        '',
      ].join('\n')
    );
  });

  test('rejects unknown personas', () => {
    expect(() =>
      generatePersonaSections(
        '## Tone\n\n<persona name="unknown">\n\nOld.\n\n</persona>\n',
        personas,
        'skill.md'
      )
    ).toThrow('skill.md references unknown persona "unknown".');
  });

  test('rejects incomplete persona elements', () => {
    expect(() =>
      generatePersonaSections(
        '## Tone\n\n<persona name="poe">\n',
        personas,
        'skill.md'
      )
    ).toThrow(
      'skill.md must have one complete persona element per Tone section.'
    );
  });

  test('rejects persona elements outside Tone sections', () => {
    expect(() =>
      generatePersonaSections(
        '## Process\n\n<persona name="poe">\n</persona>\n',
        personas
      )
    ).toThrow('Markdown has a persona element outside a Tone section.');
  });
});
