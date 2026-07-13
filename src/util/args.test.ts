import { describe, expect, test } from 'vitest';
import { parseArgs } from './args.ts';

describe(parseArgs, () => {
  test('parses positionals, options, defaults, and value validation', () => {
    const args = parseArgs(
      [
        {
          name: 'input',
          positional: true,
          required: true,
        },
        {
          name: 'quality',
          type: 'number',
          alias: 'q',
          min: 1,
          max: 100,
          default: 50,
        },
        {
          name: 'format',
          values: ['avif', 'webp'],
          default: 'avif',
        },
        {
          name: 'force',
          type: 'boolean',
          default: false,
        },
      ],
      ['image.jpg', '-q75', '--format=webp', '--force']
    );

    expect(args).toStrictEqual({
      input: 'image.jpg',
      quality: 75,
      format: 'webp',
      force: true,
    });
  });

  test('maps long aliases to canonical names in argument order', () => {
    const args = parseArgs(
      [
        {
          name: 'quality',
          type: 'number',
          alias: 'q',
          default: 50,
        },
      ],
      ['--quality=60', '--q=70']
    );

    expect(args.quality).toBe(70);
  });

  test('parses negated boolean options', () => {
    const args = parseArgs(
      [
        {
          name: 'force',
          type: 'boolean',
          default: true,
        },
      ],
      ['--no-force']
    );

    expect(args.force).toBe(false);
  });
});
