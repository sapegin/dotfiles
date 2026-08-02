import os from 'node:os';

const GLOBAL_DOMAIN = 'NSGlobalDomain';
const WRITE_PATTERN =
  /^(?:sudo\s+)?defaults(?:\s+-currentHost)?\s+write\s+(-g|NSGlobalDomain|\S+)\s+("(?:[^"\\]|\\.)*"|\S+)\s+(-(?:boolean|integer|real|bool|int|float|string))\s+(.+)$/;

type ValueType = 'bool' | 'int' | 'float' | 'string';

export interface DefaultsEntry {
  raw: string;
  domain: string;
  key: string;
  valueType: ValueType;
  expected: string | boolean | number;
  currentHost: boolean;
  sudo: boolean;
}

export interface InvalidTypeFlags {
  lines: string[];
}

export function isInvalidTypeFlags(error: unknown): error is InvalidTypeFlags {
  return (
    typeof error === 'object' &&
    error !== null &&
    'lines' in error &&
    Array.isArray(error.lines)
  );
}

/** Parse active (uncommented) typed `defaults write` lines. */
export function parseEntries(source: string): DefaultsEntry[] {
  const entries: DefaultsEntry[] = [];
  const invalidTypeLines: string[] = [];

  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('#') ||
      /^(?:sudo\s+)?defaults\s+write/.test(trimmed) === false
    ) {
      continue;
    }

    const match = trimmed.match(WRITE_PATTERN);
    if (match === null) {
      continue;
    }

    const [, domainToken, keyToken, typeToken, rawValue] = match;
    const typeName = typeToken.slice(1);
    if (
      typeName === 'boolean' ||
      typeName === 'integer' ||
      typeName === 'real'
    ) {
      invalidTypeLines.push(trimmed);
      continue;
    }

    const valueType = typeName as ValueType;

    entries.push({
      raw: trimmed,
      domain: domainToken === '-g' ? GLOBAL_DOMAIN : domainToken,
      key: stripQuotes(keyToken),
      valueType,
      expected: parseExpected(valueType, rawValue.trim()),
      currentHost: trimmed.includes('-currentHost'),
      sudo: trimmed.startsWith('sudo '),
    });
  }

  if (invalidTypeLines.length > 0) {
    const error = new Error('Invalid defaults type flags') as Error &
      InvalidTypeFlags;
    error.lines = invalidTypeLines;
    throw error;
  }

  return entries;
}

/** Expand shell variables used in macos-defaults string values for comparison. */
export function expandShellVars(value: string): string {
  const home = os.homedir();
  return value.replaceAll('${HOME}', home).replaceAll('$HOME', home);
}

/** Strip shell-style single or double quotes from a defaults value token. */
export function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Parse a bool value. */
export function parseBool(value: string): boolean {
  return (
    value === '1' ||
    value.toLowerCase() === 'true' ||
    value.toLowerCase() === 'yes'
  );
}

function parseExpected(
  valueType: ValueType,
  rawValue: string
): string | boolean | number {
  const value = stripQuotes(rawValue);
  switch (valueType) {
    case 'bool':
      return parseBool(value);
    case 'int':
      return Number.parseInt(value, 10);
    case 'float':
      return Number.parseFloat(value);
    default:
      return value;
  }
}
