// Diff Photomator .photo-edit files.
//
// - Compare two files:
//
// `photo-edit-diff {{before.photo-edit}} {{after.photo-edit}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from '../util/args.ts';
import { untildify } from '../util/files.ts';
import { run } from '../util/tui.ts';

const FIELD_SEPARATOR = '\u001F';
const MAX_COMMAND_OUTPUT = 1024 * 1024 * 100;
const MAX_TEXT_PREVIEW_LENGTH = 400;
const IGNORED_COLUMNS = new Set(['timestamp']);
const IGNORED_PATHS = new Set([
  'versionSpecificInfo.imageMetadata.versionSpecificInfo.xmpData',
]);

const cliArgs = parseArgs([
  {
    name: 'beforePath',
    positional: true,
    required: true,
  },
  {
    name: 'afterPath',
    positional: true,
    required: true,
  },
]);

type DecodedValue =
  | null
  | string
  | number
  | {
      readonly kind: 'empty';
    }
  | {
      readonly kind: 'json';
      readonly value: unknown;
    }
  | {
      readonly kind: 'plist';
      readonly value: unknown;
    }
  | {
      readonly kind: 'text';
      readonly value: string;
    }
  | {
      readonly kind: 'appleTimestamp';
      readonly value: string;
    }
  | {
      readonly kind: 'binary';
      readonly byteLength: number;
      readonly sha256: string;
      readonly previewHex: string;
    };

interface DecodedRow {
  readonly key: string;
  readonly values: Readonly<Record<string, DecodedValue>>;
}

interface ValueChange {
  readonly table: string;
  readonly row: string;
  readonly field: string;
  readonly path: string;
  readonly before: unknown;
  readonly after: unknown;
}

interface StructuredValue {
  readonly value: unknown;
}

async function unpackPhotoEdit(
  inputPath: string,
  tempDir: string
): Promise<string> {
  const stats = await fs.stat(inputPath);
  if (stats.isDirectory()) {
    return inputPath;
  }

  const unpackedDir = path.join(tempDir, randomUUID());
  await fs.mkdir(unpackedDir, { recursive: true });
  execFileSync('unzip', ['-qq', inputPath, '-d', unpackedDir], {
    maxBuffer: MAX_COMMAND_OUTPUT,
  });
  return unpackedDir;
}

async function locateMetadataInfo(root: string): Promise<string> {
  const matches = await Array.fromAsync(
    fs.glob('**/metadata.info', { cwd: root })
  );
  if (matches.length === 0) {
    throw new Error('metadata.info not found');
  }
  if (matches.length > 1) {
    throw new Error(
      `Expected one metadata.info file, found ${matches.length}: ${matches.join(', ')}`
    );
  }
  return path.join(root, matches[0]);
}

function runSqlite(databasePath: string, query: string): string {
  return execFileSync(
    'sqlite3',
    ['-readonly', '-separator', FIELD_SEPARATOR, databasePath, query],
    {
      encoding: 'utf8',
      maxBuffer: MAX_COMMAND_OUTPUT,
    }
  ).trimEnd();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function getTableNames(databasePath: string): string[] {
  const output = runSqlite(
    databasePath,
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  return output === '' ? [] : output.split('\n');
}

function getColumnNames(databasePath: string, tableName: string): string[] {
  const output = runSqlite(
    databasePath,
    `PRAGMA table_info(${quoteIdentifier(tableName)});`
  );
  return output === ''
    ? []
    : output.split('\n').map((line) => line.split(FIELD_SEPARATOR)[1]);
}

function parseQuotedValue(value: string): Buffer | string | number | null {
  if (value === 'NULL') {
    return null;
  }
  if (value.startsWith("X'") && value.endsWith("'")) {
    return Buffer.from(value.slice(2, -1), 'hex');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

function isLikelyText(value: string): boolean {
  return value.includes('\uFFFD') === false && value.includes('\0') === false;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)])
    );
  }
  return value;
}

async function tryDecodePlist(
  buffer: Buffer,
  tempDir: string
): Promise<DecodedValue | undefined> {
  const payloadPath = path.join(tempDir, `payload-${randomUUID()}`);
  await fs.writeFile(payloadPath, buffer);
  try {
    const json = execFileSync(
      'plutil',
      ['-convert', 'json', '-o', '-', payloadPath],
      {
        encoding: 'utf8',
        maxBuffer: MAX_COMMAND_OUTPUT,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    );
    return {
      kind: 'plist',
      value: sortObjectKeys(JSON.parse(json)),
    };
  } catch {
    return undefined;
  } finally {
    await fs.rm(payloadPath, { force: true });
  }
}

function decodeAppleTimestamp(buffer: Buffer): DecodedValue | undefined {
  if (buffer.byteLength !== 8) {
    return undefined;
  }
  const secondsSinceAppleEpoch = buffer.readDoubleBE(0);
  return {
    kind: 'appleTimestamp',
    value: new Date(
      Date.UTC(2001, 0, 1) + secondsSinceAppleEpoch * 1000
    ).toISOString(),
  };
}

function getBinaryPayload(buffer: Buffer): DecodedValue {
  return {
    kind: 'binary',
    byteLength: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    previewHex: buffer.subarray(0, 64).toString('hex'),
  };
}

async function decodeBuffer(
  buffer: Buffer,
  columnName: string,
  tempDir: string
): Promise<DecodedValue> {
  if (buffer.byteLength === 0) {
    return { kind: 'empty' };
  }

  if (columnName === 'timestamp') {
    const timestamp = decodeAppleTimestamp(buffer);
    if (timestamp !== undefined) {
      return timestamp;
    }
  }

  const text = buffer.toString('utf8');
  if (isLikelyText(text)) {
    try {
      return {
        kind: 'json',
        value: sortObjectKeys(JSON.parse(text.trim())),
      };
    } catch {
      return {
        kind: 'text',
        value:
          text.length <= MAX_TEXT_PREVIEW_LENGTH
            ? text
            : `${text.slice(0, MAX_TEXT_PREVIEW_LENGTH)}…`,
      };
    }
  }

  const plist = await tryDecodePlist(buffer, tempDir);
  return plist ?? getBinaryPayload(buffer);
}

function decodeValue(
  value: Buffer | string | number | null,
  columnName: string,
  tempDir: string
): DecodedValue | Promise<DecodedValue> {
  return Buffer.isBuffer(value)
    ? decodeBuffer(value, columnName, tempDir)
    : value;
}

function getRowKeyValue(value: DecodedValue): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    value === null
    ? String(value)
    : canonicalJson(value);
}

function getRowKey(
  tableName: string,
  values: Readonly<Record<string, DecodedValue>>
): string {
  if (tableName === 'layer_info') {
    return `${getRowKeyValue(values.layer_id)}:${getRowKeyValue(values.key)}`;
  }
  if (tableName === 'storable_info') {
    return `${getRowKeyValue(values.identifier)}:${getRowKeyValue(values.layer_identifier)}`;
  }
  if (
    tableName === 'document_info' ||
    tableName === 'document_meta' ||
    tableName === 'ql_info'
  ) {
    return getRowKeyValue(values.key);
  }
  if (tableName === 'document_layers') {
    return getRowKeyValue(values.identifier);
  }
  return canonicalJson(values);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function shouldInlineArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    canonicalJson(value).length <= 80 &&
    value.every(
      (item) =>
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean' ||
        shouldInlineArray(item)
    )
  );
}

function formatJson(value: unknown, indent = 0): string {
  const spacing = ' '.repeat(indent);
  const nestedSpacing = ' '.repeat(indent + 2);

  if (shouldInlineArray(value)) {
    return canonicalJson(value);
  }
  if (Array.isArray(value)) {
    return [
      '[',
      ...value.map((item, index) => {
        const suffix = index === value.length - 1 ? '' : ',';
        return `${nestedSpacing}${formatJson(item, indent + 2)}${suffix}`;
      }),
      `${spacing}]`,
    ].join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).toSorted(([keyA], [keyB]) =>
      keyA.localeCompare(keyB)
    );
    return [
      '{',
      ...entries.map(([key, item], index) => {
        const suffix = index === entries.length - 1 ? '' : ',';
        return `${nestedSpacing}${JSON.stringify(key)}: ${formatJson(item, indent + 2)}${suffix}`;
      }),
      `${spacing}}`,
    ].join('\n');
  }
  return JSON.stringify(value);
}

async function getTableRows(
  databasePath: string,
  tableName: string,
  tempDir: string
): Promise<DecodedRow[]> {
  const columns = getColumnNames(databasePath, tableName);
  const select = `json_array(${columns
    .map((columnName) => `quote(${quoteIdentifier(columnName)})`)
    .join(', ')})`;
  const output = runSqlite(
    databasePath,
    `SELECT ${select} FROM ${quoteIdentifier(tableName)} ORDER BY 1;`
  );

  if (output === '') {
    return [];
  }

  const rows = await Promise.all(
    output.split('\n').map(async (line) => {
      const rawValues = JSON.parse(line) as string[];
      if (rawValues.length !== columns.length) {
        throw new Error(
          `Expected ${columns.length} values from ${tableName}, got ${rawValues.length}`
        );
      }
      const entries = await Promise.all(
        columns.map(async (columnName, index) => [
          columnName,
          await decodeValue(
            parseQuotedValue(rawValues[index]),
            columnName,
            tempDir
          ),
        ])
      );
      const values = Object.fromEntries(entries) as Record<
        string,
        DecodedValue
      >;
      return {
        key: getRowKey(tableName, values),
        values,
      };
    })
  );
  return rows;
}

async function getDatabasePath(
  inputPath: string,
  tempDir: string
): Promise<string> {
  const unpackedRoot = await unpackPhotoEdit(inputPath, tempDir);
  return locateMetadataInfo(unpackedRoot);
}

function getStructuredValue(value: DecodedValue): StructuredValue | undefined {
  return typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value.kind === 'json' || value.kind === 'plist')
    ? { value: value.value }
    : undefined;
}

function pathToString(pathParts: readonly string[]): string {
  return pathParts
    .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`))
    .join('')
    .replace(/^\./, '');
}

function summarizeChangedValue(value: unknown): unknown {
  if (value === undefined) {
    return { kind: 'missing' };
  }
  if (typeof value !== 'string' || value.length <= MAX_TEXT_PREVIEW_LENGTH) {
    return value;
  }
  return {
    kind: 'textPreview',
    byteLength: Buffer.byteLength(value),
    sha256: createHash('sha256').update(value).digest('hex'),
    value: `${value.slice(0, MAX_TEXT_PREVIEW_LENGTH)}…`,
  };
}

function getValueChange(
  pathParts: readonly string[],
  beforeValue: unknown,
  afterValue: unknown
): ValueChange[] {
  return pathParts.length === 0
    ? []
    : [
        {
          table: '',
          row: '',
          field: '',
          path: pathToString(pathParts),
          before: summarizeChangedValue(beforeValue),
          after: summarizeChangedValue(afterValue),
        },
      ];
}

function diffStructuredValues(
  beforeValue: unknown,
  afterValue: unknown,
  pathParts: readonly string[] = []
): ValueChange[] {
  if (IGNORED_PATHS.has(pathToString(pathParts))) {
    return [];
  }
  if (canonicalJson(beforeValue) === canonicalJson(afterValue)) {
    return [];
  }

  if (shouldInlineArray(beforeValue) && shouldInlineArray(afterValue)) {
    return getValueChange(pathParts, beforeValue, afterValue);
  }

  if (
    Array.isArray(beforeValue) &&
    Array.isArray(afterValue) &&
    beforeValue.length === afterValue.length
  ) {
    return beforeValue.flatMap((nestedBeforeValue, index) =>
      diffStructuredValues(nestedBeforeValue, afterValue[index], [
        ...pathParts,
        String(index),
      ])
    );
  }

  if (
    beforeValue !== null &&
    afterValue !== null &&
    typeof beforeValue === 'object' &&
    typeof afterValue === 'object' &&
    Array.isArray(beforeValue) === false &&
    Array.isArray(afterValue) === false
  ) {
    const keys = [
      ...new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]),
    ].toSorted((keyA, keyB) => keyA.localeCompare(keyB));
    return keys.flatMap((key) =>
      diffStructuredValues(
        (beforeValue as Record<string, unknown>)[key],
        (afterValue as Record<string, unknown>)[key],
        [...pathParts, key]
      )
    );
  }

  return getValueChange(pathParts, beforeValue, afterValue);
}

function diffRows(
  tableName: string,
  beforeRows: readonly DecodedRow[],
  afterRows: readonly DecodedRow[]
): ValueChange[] {
  const beforeByKey = new Map(beforeRows.map((row) => [row.key, row]));
  return afterRows.flatMap((afterRow) => {
    const beforeRow = beforeByKey.get(afterRow.key);
    if (beforeRow === undefined) {
      return [];
    }

    return Object.keys(afterRow.values).flatMap((fieldName) => {
      if (IGNORED_COLUMNS.has(fieldName)) {
        return [];
      }

      const beforeValue = getStructuredValue(beforeRow.values[fieldName]);
      const afterValue = getStructuredValue(afterRow.values[fieldName]);
      if (beforeValue === undefined || afterValue === undefined) {
        return [];
      }

      return diffStructuredValues(beforeValue.value, afterValue.value).map(
        (change) => ({
          ...change,
          table: tableName,
          row: afterRow.key,
          field: fieldName,
        })
      );
    });
  });
}

async function diffPhotoEdits(
  beforePath: string,
  afterPath: string,
  tempDir: string
): Promise<ValueChange[]> {
  const beforeDatabase = await getDatabasePath(beforePath, tempDir);
  const afterDatabase = await getDatabasePath(afterPath, tempDir);
  const tableNames = [
    ...new Set([
      ...getTableNames(beforeDatabase),
      ...getTableNames(afterDatabase),
    ]),
  ].toSorted((tableA, tableB) => tableA.localeCompare(tableB));

  const changesByTable = await Promise.all(
    tableNames.map(async (tableName) =>
      diffRows(
        tableName,
        await getTableRows(beforeDatabase, tableName, tempDir),
        await getTableRows(afterDatabase, tableName, tempDir)
      )
    )
  );

  return changesByTable.flat();
}

async function main(): Promise<void> {
  const beforePath = path.resolve(untildify(cliArgs.beforePath));
  const afterPath = path.resolve(untildify(cliArgs.afterPath));
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-edit-diff-'));
  try {
    const changes = await diffPhotoEdits(beforePath, afterPath, tempDir);
    console.log(formatJson(changes));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

await run(main);
