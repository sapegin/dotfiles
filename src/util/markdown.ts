import YAML from 'yaml';

const STRING_ARRAY_FIELDS = ['aliases', 'keywords', 'tags'] as const;

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    const strings = value.filter(
      (item): item is string => typeof item === 'string'
    );
    return strings.length > 0 ? strings : undefined;
  }

  return undefined;
}

function normalizeFrontmatter<T extends object>(raw: unknown): T {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {} as T;
  }

  const record = { ...(raw as Record<string, unknown>) };

  for (const key of STRING_ARRAY_FIELDS) {
    if (key in record) {
      record[key] = normalizeStringArray(record[key]);
    }
  }

  return record as T;
}

/**
 * Split YAML frontmatter from Markdown body and parse it into an object. Scalar
 * YAML lists such as `tags`, `aliases`, and `keywords` are coerced to
 * `string[]`.
 */
export function parseFrontmatter<T extends object>(
  content: string
): {
  frontmatter: T;
  body: string;
  hasFrontmatter: boolean;
} {
  const match = content.match(/^---\r?\n((?:[\s\S]*?\r?\n)?)---(?:\r?\n|$)/);
  if (match === null) {
    return { frontmatter: {} as T, body: content, hasFrontmatter: false };
  }

  return {
    frontmatter: normalizeFrontmatter<T>(YAML.parse(match[1]) ?? {}),
    body: content.slice(match[0].length),
    hasFrontmatter: true,
  };
}

type FrontmatterValue = string | string[] | undefined;

function formatYamlSingleQuotedString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Write a Markdown body with YAML frontmatter. */
export function formatMarkdown(
  frontmatter: Record<string, FrontmatterValue>,
  body: string
): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
      continue;
    }

    if (key === 'description') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }

      lines.push(`description: ${formatYamlSingleQuotedString(trimmed)}`);
      continue;
    }

    if (key === 'title') {
      lines.push(`title: ${JSON.stringify(value)}`);
      continue;
    }

    lines.push(`${key}: ${value}`);
  }

  lines.push('---', '', body.trim(), '');

  return lines.join('\n');
}
