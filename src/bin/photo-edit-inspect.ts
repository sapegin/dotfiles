// Inspect Photomator .photo-edit files.
//
// Usage: photo-edit-inspect [--output folder] <file.photo-edit>
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
import { logError, logWarn } from '../util/log.ts';
import { tildify, untildify } from '../util/tildify.ts';

const FIELD_SEPARATOR = '\u001F';
const MAX_COMMAND_OUTPUT = 1024 * 1024 * 100;
const MAX_TEXT_PREVIEW_LENGTH = 400;

interface CliOptions {
  readonly inputPath: string;
  readonly outputDir: string | undefined;
}

type DecodedPayload =
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
      readonly kind: 'binary';
      readonly byteLength: number;
      readonly sha256: string;
      readonly previewHex: string;
    };

interface PlistDecodeResult {
  readonly value: unknown;
}

type StructuredPayload = Extract<DecodedPayload, { kind: 'json' | 'plist' }>;

interface StorableInfoRow {
  readonly identifier: string;
  readonly timestamp: string;
  readonly contentUti: string;
  readonly layerIdentifier: string;
  readonly userDataLength: number;
  readonly optionsLength: number;
  readonly userData: DecodedPayload;
  readonly options: DecodedPayload;
}

interface InspectionReport {
  readonly archive: string;
  readonly metadataPath: string;
  readonly tables: readonly {
    readonly name: string;
    readonly rowCount: number;
  }[];
  readonly storableInfo: readonly StorableInfoRow[];
  readonly schema: string;
}

function usage(): string {
  return [
    'Usage: photo-edit-inspect [--output folder] <file.photo-edit>',
    '',
    'Inspects Photomator edit archives and prints compare-friendly JSON.',
    '',
    'Options:',
    '  --output, -o  Write inspect.json, schema.sql, and decoded payload files',
    '  --help, -h    Show this help',
  ].join('\n');
}

function parseArgs(args: readonly string[]): CliOptions {
  const outputFlagIndex = args.findIndex(
    (arg) => arg === '--output' || arg === '-o'
  );
  const outputDir =
    outputFlagIndex === -1 ? undefined : args[outputFlagIndex + 1];
  const argsWithoutOutput =
    outputFlagIndex === -1
      ? args
      : args.filter(
          (_, index) =>
            index !== outputFlagIndex && index !== outputFlagIndex + 1
        );

  if (
    argsWithoutOutput.includes('--help') ||
    argsWithoutOutput.includes('-h')
  ) {
    console.log(usage());
    process.exit(0);
  }

  if (
    argsWithoutOutput.length !== 1 ||
    (outputFlagIndex !== -1 && outputDir === undefined)
  ) {
    logWarn(usage());
    process.exit(1);
  }

  return {
    inputPath: path.resolve(untildify(argsWithoutOutput[0])),
    outputDir:
      outputDir === undefined ? undefined : path.resolve(untildify(outputDir)),
  };
}

async function unpackPhotoEdit(
  inputPath: string,
  tempDir: string
): Promise<string> {
  const stats = await fs.stat(inputPath);
  if (stats.isDirectory()) {
    return inputPath;
  }

  const unpackedDir = path.join(tempDir, 'photo-edit');
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

function getTableNames(databasePath: string): string[] {
  const output = runSqlite(
    databasePath,
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  return output === '' ? [] : output.split('\n');
}

function getTableCount(databasePath: string, tableName: string): number {
  const quotedTableName = tableName.replaceAll('"', '""');
  const output = runSqlite(
    databasePath,
    `SELECT count(*) FROM "${quotedTableName}";`
  );
  return Number.parseInt(output, 10);
}

function getSchema(databasePath: string): string {
  return execFileSync('sqlite3', ['-readonly', databasePath, '.schema'], {
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
  }).trimEnd();
}

function parseHexPayload(hex: string): Buffer {
  return hex === '' ? Buffer.from([]) : Buffer.from(hex, 'hex');
}

function parseAppleTimestamp(hex: string): string {
  if (hex.length !== 16) {
    return '';
  }
  const secondsSinceAppleEpoch = Buffer.from(hex, 'hex').readDoubleBE(0);
  return new Date(
    Date.UTC(2001, 0, 1) + secondsSinceAppleEpoch * 1000
  ).toISOString();
}

function isLikelyText(value: string): boolean {
  return value.includes('\uFFFD') === false && value.includes('\0') === false;
}

function getBinaryPayload(buffer: Buffer): DecodedPayload {
  return {
    kind: 'binary',
    byteLength: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    previewHex: buffer.subarray(0, 64).toString('hex'),
  };
}

async function tryDecodePlist(
  buffer: Buffer,
  tempDir: string
): Promise<PlistDecodeResult | undefined> {
  const payloadPath = path.join(tempDir, `payload-${randomUUID()}`);
  await fs.writeFile(payloadPath, buffer);
  try {
    const json = execFileSync(
      'plutil',
      ['-convert', 'json', '-o', '-', payloadPath],
      {
        encoding: 'utf8',
        maxBuffer: MAX_COMMAND_OUTPUT,
      }
    );
    return {
      value: JSON.parse(json),
    };
  } catch {
    return undefined;
  } finally {
    await fs.rm(payloadPath, { force: true });
  }
}

async function decodePayload(
  buffer: Buffer,
  tempDir: string
): Promise<DecodedPayload> {
  if (buffer.byteLength === 0) {
    return { kind: 'empty' };
  }

  const text = buffer.toString('utf8');
  const trimmedText = text.trim();
  if (isLikelyText(text)) {
    try {
      return {
        kind: 'json',
        value: JSON.parse(trimmedText),
      };
    } catch {
      const decodedPlist = await tryDecodePlist(buffer, tempDir);
      if (decodedPlist !== undefined) {
        return {
          kind: 'plist',
          value: decodedPlist.value,
        };
      }

      return {
        kind: 'text',
        value:
          text.length <= MAX_TEXT_PREVIEW_LENGTH
            ? text
            : `${text.slice(0, MAX_TEXT_PREVIEW_LENGTH)}…`,
      };
    }
  }

  const decodedPlist = await tryDecodePlist(buffer, tempDir);
  return decodedPlist === undefined
    ? getBinaryPayload(buffer)
    : {
        kind: 'plist',
        value: decodedPlist.value,
      };
}

async function getStorableInfoRows(
  databasePath: string,
  tempDir: string
): Promise<StorableInfoRow[]> {
  const tables = getTableNames(databasePath);
  if (tables.includes('storable_info') === false) {
    return [];
  }

  const output = runSqlite(
    databasePath,
    [
      'SELECT',
      "  ifnull(identifier, ''),",
      "  ifnull(hex(timestamp), ''),",
      "  ifnull(content_uti, ''),",
      "  ifnull(layer_identifier, ''),",
      '  ifnull(length(user_data), 0),',
      '  ifnull(length(options), 0),',
      "  ifnull(hex(user_data), ''),",
      "  ifnull(hex(options), '')",
      'FROM storable_info',
      'ORDER BY identifier;',
    ].join('\n')
  );

  if (output === '') {
    return [];
  }

  const rows = await Promise.all(
    output.split('\n').map(async (line): Promise<StorableInfoRow> => {
      const [
        identifier,
        timestampHex,
        contentUti,
        layerIdentifier,
        userDataLength,
        optionsLength,
        userDataHex,
        optionsHex,
      ] = line.split(FIELD_SEPARATOR);

      return {
        identifier,
        timestamp: parseAppleTimestamp(timestampHex),
        contentUti,
        layerIdentifier,
        userDataLength: Number.parseInt(userDataLength, 10),
        optionsLength: Number.parseInt(optionsLength, 10),
        userData: await decodePayload(parseHexPayload(userDataHex), tempDir),
        options: await decodePayload(parseHexPayload(optionsHex), tempDir),
      };
    })
  );
  return rows;
}

function sanitizeFilename(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9._-]+/g, '_').replaceAll(/^_+|_+$/g, '');
}

function isStructuredPayload(
  payload: DecodedPayload
): payload is StructuredPayload {
  return payload.kind === 'json' || payload.kind === 'plist';
}

async function writePayloadFiles(
  outputDir: string,
  rows: readonly StorableInfoRow[]
): Promise<void> {
  const payloadsDir = path.join(outputDir, 'payloads');
  await fs.mkdir(payloadsDir, { recursive: true });

  const decodedPayloads = rows.flatMap((row, index) => {
    const payloadFields: readonly {
      readonly field: 'user_data' | 'options';
      readonly payload: DecodedPayload;
    }[] = [
      { field: 'user_data', payload: row.userData },
      { field: 'options', payload: row.options },
    ];

    return payloadFields.flatMap(({ field, payload }) =>
      isStructuredPayload(payload)
        ? [
            {
              filename: `${String(index + 1).padStart(3, '0')}-${sanitizeFilename(row.identifier) || 'unknown'}-${field}.json`,
              payload,
            },
          ]
        : []
    );
  });

  await Promise.all(
    decodedPayloads.map(({ filename, payload }) =>
      fs.writeFile(
        path.join(payloadsDir, filename),
        `${JSON.stringify(payload.value, null, 2)}\n`
      )
    )
  );
}

async function inspectPhotoEdit(
  inputPath: string,
  tempDir: string
): Promise<InspectionReport> {
  const unpackedRoot = await unpackPhotoEdit(inputPath, tempDir);
  const metadataPath = await locateMetadataInfo(unpackedRoot);
  const tableNames = getTableNames(metadataPath);
  const tables = tableNames.map((name) => ({
    name,
    rowCount: getTableCount(metadataPath, name),
  }));

  return {
    archive: path.basename(inputPath),
    metadataPath: path.relative(unpackedRoot, metadataPath),
    tables,
    storableInfo: await getStorableInfoRows(metadataPath, tempDir),
    schema: getSchema(metadataPath),
  };
}

async function writeReport(
  outputDir: string,
  report: InspectionReport
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(outputDir, 'inspect.json'),
      `${JSON.stringify(report, null, 2)}\n`
    ),
    fs.writeFile(path.join(outputDir, 'schema.sql'), `${report.schema}\n`),
    writePayloadFiles(outputDir, report.storableInfo),
  ]);
}

async function main(): Promise<void> {
  const { inputPath, outputDir } = parseArgs(process.argv.slice(2));
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'photo-edit-inspect-')
  );

  try {
    const report = await inspectPhotoEdit(inputPath, tempDir);

    if (outputDir === undefined) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    await writeReport(outputDir, report);
    console.log(`Wrote ${tildify(outputDir)}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
