// oxlint-disable typescript/no-non-null-assertion

// Create a modified Photomator .photo-edit file from an existing template.
//
// Usage:
//   photo-edit-create --output out.photo-edit template.photo-edit exposure 23%
//   photo-edit-create --output out.photo-edit template.photo-edit crop 2500 6240
//   photo-edit-create --output out.photo-edit template.photo-edit crop 1000 500 2500 3000
//   photo-edit-create --output out.photo-edit template.photo-edit rotate 4deg
//   photo-edit-create --output out.photo-edit template.photo-edit flip horizontal
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { parseArgs } from '../util/args.ts';
import { run } from '../util/run.ts';
import { untildify } from '../util/tildify.ts';

const MAX_COMMAND_OUTPUT = 1024 * 1024 * 100;
const DOCUMENT_STATE_IDENTIFIER =
  'com.pixelmatorteam.ptfoundation.photomator-document-state-info';

type QuickLookOperation =
  | {
      readonly kind: 'crop';
      readonly originalWidth: number;
      readonly originalHeight: number;
      readonly left: number;
      readonly top: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: 'rotate';
      readonly angle: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: 'flip';
      readonly direction: 'horizontal' | 'vertical';
    };

const cliArgs = parseArgs([
  {
    name: 'templatePath',
    positional: true,
    required: true,
  },
  {
    name: 'operation',
    positional: true,
    required: true,
    values: ['crop', 'exposure', 'flip', 'rotate', 'temperature', 'tint'],
  },
  {
    name: 'value',
    positional: true,
    required: true,
  },
  {
    name: 'value2',
    positional: true,
  },
  {
    name: 'value3',
    positional: true,
  },
  {
    name: 'value4',
    positional: true,
  },
  {
    name: 'output',
    type: 'string',
    alias: 'o',
    required: true,
  },
  {
    name: 'force',
    type: 'boolean',
    default: false,
  },
]);

function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function getDocumentStateWhereSql(): string {
  return `identifier = ${quoteSqlString(
    DOCUMENT_STATE_IDENTIFIER
  )} AND layer_identifier IS NULL`;
}

function runSqlite(databasePath: string, query: string): string {
  return execFileSync('sqlite3', [databasePath, query], {
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
  }).trimEnd();
}

async function unpackPhotoEdit(
  inputPath: string,
  tempDir: string
): Promise<string> {
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

function parseJsonBlob<T>(
  databasePath: string,
  tableName: string,
  columnName: string,
  whereSql: string
): T {
  const hex = runSqlite(
    databasePath,
    `SELECT hex(${columnName}) FROM ${tableName} WHERE ${whereSql};`
  );
  if (hex === '') {
    throw new Error(`No ${tableName}.${columnName} row matches ${whereSql}`);
  }
  return JSON.parse(Buffer.from(hex, 'hex').toString('utf8')) as T;
}

async function updateJsonBlob(
  databasePath: string,
  tableName: string,
  columnName: string,
  whereSql: string,
  value: unknown,
  tempDir: string
): Promise<void> {
  const payloadPath = path.join(tempDir, `${tableName}-${columnName}.json`);
  await fs.writeFile(payloadPath, JSON.stringify(value));
  runSqlite(
    databasePath,
    `UPDATE ${tableName} SET ${columnName} = readfile(${quoteSqlString(
      payloadPath
    )}) WHERE ${whereSql};`
  );
}

function parseNumber(value: string, label: string): number {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) === false) {
    throw new TypeError(`Invalid ${label}: ${value}`);
  }
  return numberValue;
}

function parseScalar(value: string): number {
  return value.endsWith('%')
    ? parseNumber(value.slice(0, -1), 'percent value') / 100
    : parseNumber(value, 'value');
}

function parseAngle(value: string): number {
  return value.endsWith('deg')
    ? parseNumber(value.slice(0, -3), 'angle')
    : parseNumber(value, 'angle');
}

function getVersionSpecificContainer(value: unknown): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    'versionSpecificContainer' in value === false
  ) {
    throw new Error('Expected a versionSpecificContainer object');
  }
  return (value as { versionSpecificContainer: Record<string, unknown> })
    .versionSpecificContainer;
}

function getDocumentSlice(value: unknown): Record<string, unknown> {
  const container = getVersionSpecificContainer(value);
  const documentSlice = container.documentSlice;
  return getVersionSpecificContainer(documentSlice);
}

function getDocumentTransform(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || 'c' in value === false) {
    throw new Error('Expected document state payload');
  }
  const content = (value as { c: { t: unknown } }).c;
  return getVersionSpecificContainer(content.t);
}

function assertNumberPair(value: unknown, label: string): [number, number] {
  if (
    Array.isArray(value) === false ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number'
  ) {
    throw new Error(`Expected ${label} to be a number pair`);
  }
  return [value[0], value[1]];
}

function setDocumentCropSize(
  slicesData: unknown,
  width: number,
  height: number
) {
  const documentSlice = getDocumentSlice(slicesData);
  const rect = [
    [0, 0],
    [width, height],
  ];
  documentSlice.rect = rect;
  documentSlice.subrects = [rect];
}

function getDocumentSizePayload(width: number, height: number): Buffer {
  const prefix = Buffer.from('342d74507a53444210000000', 'hex');
  const payload = Buffer.alloc(prefix.byteLength + 16);
  prefix.copy(payload);
  payload.writeBigUInt64LE(BigInt(width), 12);
  payload.writeBigUInt64LE(BigInt(height), 20);
  return payload;
}

async function updateDocumentSize(
  databasePath: string,
  width: number,
  height: number,
  tempDir: string
) {
  const payloadPath = path.join(tempDir, 'document-size');
  await fs.writeFile(payloadPath, getDocumentSizePayload(width, height));
  runSqlite(
    databasePath,
    `UPDATE document_info SET value = readfile(${quoteSqlString(
      payloadPath
    )}) WHERE key = 'size';`
  );
}

function setDocumentTransform(
  documentState: unknown,
  transformValue: number[]
) {
  getDocumentTransform(documentState).transform = transformValue;
}

function setCropOffset(documentState: unknown, left: number, top: number) {
  setDocumentTransform(documentState, [1, 0, 0, 1, -left, -top]);
}

function setColorAdjustment(
  colorAdjustments: unknown,
  groupKey: string,
  valueKey: string,
  value: number
) {
  if (Array.isArray(colorAdjustments) === false) {
    throw new TypeError('Expected color adjustments to be an array');
  }
  const payload = colorAdjustments[1] as Record<string, unknown>;
  const group = payload[groupKey];
  if (
    Array.isArray(group) === false ||
    group.length < 2 ||
    group[1] === null ||
    typeof group[1] !== 'object'
  ) {
    throw new Error(`Expected color adjustment group ${groupKey}`);
  }
  (group[1] as Record<string, unknown>)[valueKey] = value;
}

function applyGeometryRawParameters(rawParameters: unknown) {
  if (
    Array.isArray(rawParameters) === false ||
    rawParameters.length < 2 ||
    rawParameters[1] === null ||
    typeof rawParameters[1] !== 'object'
  ) {
    throw new TypeError('Expected raw parameters to be an array payload');
  }
  const payload = rawParameters[1] as Record<string, unknown>;
  delete payload.CuPre;
  payload.cx = 0.335_950_911_045_074_46;
  payload.cy = 0.363_117_337_226_867_7;
}

async function applyGeometrySideEffects(databasePath: string, tempDir: string) {
  const rawParameters = parseJsonBlob(
    databasePath,
    'layer_info',
    'value',
    "layer_id = 1 AND key = 'raw-parameters-data'"
  );
  applyGeometryRawParameters(rawParameters);
  await updateJsonBlob(
    databasePath,
    'layer_info',
    'value',
    "layer_id = 1 AND key = 'raw-parameters-data'",
    rawParameters,
    tempDir
  );
}

function getRotatedCropSize(
  width: number,
  height: number,
  angleDegrees: number
): [number, number] {
  if (Math.abs(angleDegrees % 180) === 90) {
    return [height, width];
  }
  const radians = (Math.abs(angleDegrees) * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const scale = Math.min(
    width / (width * cos + height * sin),
    height / (width * sin + height * cos)
  );
  return [Math.floor(width * scale), Math.floor(height * scale)];
}

function cleanTransformNumber(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function setRotation(documentState: unknown, angleDegrees: number) {
  const transform = getDocumentTransform(documentState);
  const [width, height] = assertNumberPair(transform.size, 'document size');
  const [cropWidth, cropHeight] = getRotatedCropSize(
    width,
    height,
    angleDegrees
  );
  const radians = (angleDegrees * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const tx = cropWidth / 2 - (cos * width) / 2 + (sin * height) / 2;
  const ty = cropHeight / 2 - (sin * width) / 2 - (cos * height) / 2;
  transform.transform = [cos, sin, -sin, cos, tx, ty].map(cleanTransformNumber);
  return [cropWidth, cropHeight] as const;
}

function setFlip(documentState: unknown, direction: string) {
  const transform = getDocumentTransform(documentState);
  const [width, height] = assertNumberPair(transform.size, 'document size');
  if (direction === 'horizontal') {
    transform.transform = [-1, 0, 0, 1, width, 0];
    return;
  }
  if (direction === 'vertical') {
    transform.transform = [1, 0, 0, -1, 0, height];
    return;
  }
  throw new Error(`Invalid flip direction: ${direction}`);
}

function getScaledCropDimension(
  value: number,
  scale: number,
  max: number
): number {
  return Math.min(max, Math.max(1, Math.round(value * scale)));
}

function getScaledCropOffset(
  value: number,
  scale: number,
  max: number
): number {
  return Math.min(max, Math.max(0, Math.round(value * scale)));
}

async function updateQuickLookCrop(
  filePath: string,
  operation: Extract<QuickLookOperation, { kind: 'crop' }>
) {
  const metadata = await sharp(filePath).metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error(`Could not read image dimensions: ${filePath}`);
  }
  const scaleX = metadata.width / operation.originalWidth;
  const scaleY = metadata.height / operation.originalHeight;
  const left = getScaledCropOffset(operation.left, scaleX, metadata.width - 1);
  const top = getScaledCropOffset(operation.top, scaleY, metadata.height - 1);
  const width = getScaledCropDimension(
    operation.width,
    scaleX,
    metadata.width - left
  );
  const height = getScaledCropDimension(
    operation.height,
    scaleY,
    metadata.height - top
  );
  await sharp(filePath)
    .extract({ left, top, width, height })
    .keepMetadata()
    .webp({ quality: 90 })
    .toFile(`${filePath}.tmp`);
  await fs.rename(`${filePath}.tmp`, filePath);
}

async function updateQuickLookRotate(
  filePath: string,
  operation: Extract<QuickLookOperation, { kind: 'rotate' }>
) {
  const rotated = await sharp(filePath)
    .rotate(operation.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .keepMetadata()
    .webp({ quality: 90 })
    .toBuffer();
  const metadata = await sharp(rotated).metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error(`Could not read rotated image dimensions: ${filePath}`);
  }
  const targetAspect = operation.width / operation.height;
  const currentAspect = metadata.width / metadata.height;
  const width =
    currentAspect > targetAspect
      ? Math.round(metadata.height * targetAspect)
      : metadata.width;
  const height =
    currentAspect > targetAspect
      ? metadata.height
      : Math.round(metadata.width / targetAspect);
  const left = Math.floor((metadata.width - width) / 2);
  const top = Math.floor((metadata.height - height) / 2);
  await sharp(rotated)
    .extract({ left, top, width, height })
    .keepMetadata()
    .webp({ quality: 90 })
    .toFile(`${filePath}.tmp`);
  await fs.rename(`${filePath}.tmp`, filePath);
}

async function updateQuickLookFlip(
  filePath: string,
  operation: Extract<QuickLookOperation, { kind: 'flip' }>
) {
  const image =
    operation.direction === 'horizontal'
      ? sharp(filePath).flop()
      : sharp(filePath).flip();
  await image.keepMetadata().webp({ quality: 90 }).toFile(`${filePath}.tmp`);
  await fs.rename(`${filePath}.tmp`, filePath);
}

async function updateQuickLook(
  root: string,
  operation: QuickLookOperation | undefined
) {
  if (operation === undefined) {
    return;
  }
  for (const entry of ['QuickLook/Thumbnail.webp', 'QuickLook/Icon.webp']) {
    const filePath = path.join(root, entry);
    if (operation.kind === 'crop') {
      await updateQuickLookCrop(filePath, operation);
    } else if (operation.kind === 'rotate') {
      await updateQuickLookRotate(filePath, operation);
    } else {
      await updateQuickLookFlip(filePath, operation);
    }
  }
}

async function applyOperation(
  databasePath: string,
  tempDir: string
): Promise<QuickLookOperation | undefined> {
  if (cliArgs.operation === 'crop') {
    if (cliArgs.value2 === undefined) {
      throw new Error('Crop requires width and height');
    }
    const hasOffset =
      cliArgs.value3 !== undefined || cliArgs.value4 !== undefined;
    if (
      hasOffset &&
      (cliArgs.value3 === undefined || cliArgs.value4 === undefined)
    ) {
      throw new Error('Offset crop requires left, top, width, and height');
    }
    const left = hasOffset ? parseNumber(cliArgs.value, 'crop left') : 0;
    const top = hasOffset ? parseNumber(cliArgs.value2, 'crop top') : 0;
    const width = parseNumber(
      hasOffset ? cliArgs.value3! : cliArgs.value,
      'crop width'
    );
    const height = parseNumber(
      hasOffset ? cliArgs.value4! : cliArgs.value2,
      'crop height'
    );
    const documentState = parseJsonBlob(
      databasePath,
      'storable_info',
      'user_data',
      getDocumentStateWhereSql()
    );
    const [originalWidth, originalHeight] = assertNumberPair(
      getDocumentTransform(documentState).size,
      'document size'
    );
    const slicesData = parseJsonBlob(
      databasePath,
      'document_info',
      'value',
      "key = 'slices-data'"
    );
    setDocumentCropSize(slicesData, width, height);
    await updateJsonBlob(
      databasePath,
      'document_info',
      'value',
      "key = 'slices-data'",
      slicesData,
      tempDir
    );
    await updateDocumentSize(databasePath, width, height, tempDir);
    if (left !== 0 || top !== 0) {
      setCropOffset(documentState, left, top);
      await updateJsonBlob(
        databasePath,
        'storable_info',
        'user_data',
        getDocumentStateWhereSql(),
        documentState,
        tempDir
      );
    }
    await applyGeometrySideEffects(databasePath, tempDir);
    return {
      kind: 'crop',
      originalWidth,
      originalHeight,
      left,
      top,
      width,
      height,
    };
  }

  if (cliArgs.operation === 'rotate') {
    const documentState = parseJsonBlob(
      databasePath,
      'storable_info',
      'user_data',
      getDocumentStateWhereSql()
    );
    const [width, height] = setRotation(
      documentState,
      parseAngle(cliArgs.value)
    );
    await updateJsonBlob(
      databasePath,
      'storable_info',
      'user_data',
      getDocumentStateWhereSql(),
      documentState,
      tempDir
    );

    const slicesData = parseJsonBlob(
      databasePath,
      'document_info',
      'value',
      "key = 'slices-data'"
    );
    setDocumentCropSize(slicesData, width, height);
    await updateJsonBlob(
      databasePath,
      'document_info',
      'value',
      "key = 'slices-data'",
      slicesData,
      tempDir
    );
    await updateDocumentSize(databasePath, width, height, tempDir);
    await applyGeometrySideEffects(databasePath, tempDir);
    return {
      kind: 'rotate',
      angle: parseAngle(cliArgs.value),
      width,
      height,
    };
  }

  if (cliArgs.operation === 'flip') {
    const documentState = parseJsonBlob(
      databasePath,
      'storable_info',
      'user_data',
      getDocumentStateWhereSql()
    );
    setFlip(documentState, cliArgs.value);
    await updateJsonBlob(
      databasePath,
      'storable_info',
      'user_data',
      getDocumentStateWhereSql(),
      documentState,
      tempDir
    );
    await applyGeometrySideEffects(databasePath, tempDir);
    if (cliArgs.value !== 'horizontal' && cliArgs.value !== 'vertical') {
      throw new Error(`Invalid flip direction: ${cliArgs.value}`);
    }
    return {
      kind: 'flip',
      direction: cliArgs.value,
    };
  }

  const colorAdjustments = parseJsonBlob(
    databasePath,
    'layer_info',
    'value',
    "layer_id = 1 AND key = 'color-adjustments'"
  );
  const value = parseScalar(cliArgs.value);
  if (cliArgs.operation === 'exposure') {
    setColorAdjustment(colorAdjustments, 'l', 'e', value);
  } else if (cliArgs.operation === 'temperature') {
    setColorAdjustment(colorAdjustments, 'w', 't', value);
  } else {
    setColorAdjustment(colorAdjustments, 'w', 'T', value);
  }
  await updateJsonBlob(
    databasePath,
    'layer_info',
    'value',
    "layer_id = 1 AND key = 'color-adjustments'",
    colorAdjustments,
    tempDir
  );
  return undefined;
}

async function writeArchive(root: string, outputPath: string, force: boolean) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (force) {
    await fs.rm(outputPath, { force: true });
  } else {
    try {
      await fs.lstat(outputPath);
      throw new Error(`Output already exists: ${outputPath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  execFileSync(
    'zip',
    [
      '-X',
      '-0',
      '-q',
      outputPath,
      'metadata.info',
      'QuickLook/Thumbnail.webp',
      'QuickLook/Icon.webp',
    ],
    {
      cwd: root,
      maxBuffer: MAX_COMMAND_OUTPUT,
    }
  );
}

async function main(): Promise<void> {
  const templatePath = path.resolve(untildify(cliArgs.templatePath));
  const outputPath = path.resolve(untildify(cliArgs.output));
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'photo-edit-create-')
  );

  try {
    const unpackedRoot = await unpackPhotoEdit(templatePath, tempDir);
    const databasePath = await locateMetadataInfo(unpackedRoot);
    const quickLookOperation = await applyOperation(databasePath, tempDir);
    await updateQuickLook(unpackedRoot, quickLookOperation);
    await writeArchive(unpackedRoot, outputPath, cliArgs.force);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

await run(main);
