// Convert a Lightroom XMP sidecar into a Photomator .photo-edit sidecar.
//
// Usage:
//   photo-edit-convert --template seed.photo-edit image.RAF
//   photo-edit-convert --template seed.photo-edit --xmp image.xmp --output image.photo-edit image.RAF
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from '../util/args.ts';
import { untildify } from '../util/files.ts';
import { run } from '../util/run.ts';

interface XmpAdjustments {
  readonly cropTop?: number;
  readonly cropLeft?: number;
  readonly cropBottom?: number;
  readonly cropRight?: number;
  readonly cropAngle?: number;
  readonly exposure?: number;
  readonly temperature?: number;
  readonly tint?: number;
  readonly pixelWidth?: number;
  readonly pixelHeight?: number;
}

interface Operation {
  readonly name: string;
  readonly values: readonly string[];
}

const cliArgs = parseArgs([
  {
    name: 'rawPath',
    positional: true,
    required: true,
  },
  {
    name: 'template',
    type: 'string',
    required: true,
  },
  {
    name: 'xmp',
    type: 'string',
  },
  {
    name: 'output',
    type: 'string',
    alias: 'o',
  },
  {
    name: 'force',
    type: 'boolean',
    default: false,
  },
  {
    name: 'dry-run',
    type: 'boolean',
    default: false,
  },
]);

function replaceExtension(filePath: string, extension: string): string {
  return filePath.replace(/\.[^.]+$/, extension);
}

function parseNumber(value: string, label: string): number {
  const numberValue = Number(value.replace(/^\+/, ''));
  if (Number.isFinite(numberValue) === false) {
    throw new TypeError(`Invalid ${label}: ${value}`);
  }
  return numberValue;
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function getXmpValue(xmp: string, name: string): string | undefined {
  const elementMatch = xmp.match(
    new RegExp(`<[^\\s:>]+:${name}\\b[^>]*>([^<]*)</[^:>]+:${name}>`)
  );
  if (elementMatch?.[1] !== undefined) {
    return decodeXml(elementMatch[1].trim());
  }

  const attributeMatch = xmp.match(
    new RegExp(`\\b[^\\s:=>]+:${name}="([^"]*)"`)
  );
  if (attributeMatch?.[1] !== undefined) {
    return decodeXml(attributeMatch[1].trim());
  }

  return undefined;
}

function getXmpNumber(xmp: string, name: string): number | undefined {
  const value = getXmpValue(xmp, name);
  return value === undefined ? undefined : parseNumber(value, name);
}

function parseXmpAdjustments(xmp: string): XmpAdjustments {
  return {
    cropTop: getXmpNumber(xmp, 'CropTop'),
    cropLeft: getXmpNumber(xmp, 'CropLeft'),
    cropBottom: getXmpNumber(xmp, 'CropBottom'),
    cropRight: getXmpNumber(xmp, 'CropRight'),
    cropAngle: getXmpNumber(xmp, 'CropAngle'),
    exposure: getXmpNumber(xmp, 'Exposure2012'),
    temperature: getXmpNumber(xmp, 'Temperature'),
    tint: getXmpNumber(xmp, 'Tint'),
    pixelWidth: getXmpNumber(xmp, 'PixelXDimension'),
    pixelHeight: getXmpNumber(xmp, 'PixelYDimension'),
  };
}

function hasCrop(adjustments: XmpAdjustments): boolean {
  return (
    adjustments.cropTop !== undefined ||
    adjustments.cropLeft !== undefined ||
    adjustments.cropBottom !== undefined ||
    adjustments.cropRight !== undefined
  );
}

function getCropOperation(adjustments: XmpAdjustments): Operation | undefined {
  if (hasCrop(adjustments) === false) {
    return undefined;
  }
  if (
    adjustments.pixelWidth === undefined ||
    adjustments.pixelHeight === undefined
  ) {
    throw new Error(
      'Crop conversion requires PixelXDimension and PixelYDimension'
    );
  }

  const top = adjustments.cropTop ?? 0;
  const left = adjustments.cropLeft ?? 0;
  const bottom = adjustments.cropBottom ?? 1;
  const right = adjustments.cropRight ?? 1;
  const cropLeft = Math.round(left * adjustments.pixelWidth);
  const cropTop = Math.round(top * adjustments.pixelHeight);
  const cropWidth = Math.round((right - left) * adjustments.pixelWidth);
  const cropHeight = Math.round((bottom - top) * adjustments.pixelHeight);

  if (
    cropLeft === 0 &&
    cropTop === 0 &&
    cropWidth === adjustments.pixelWidth &&
    cropHeight === adjustments.pixelHeight
  ) {
    return undefined;
  }

  return {
    name: 'crop',
    values: [
      String(cropLeft),
      String(cropTop),
      String(cropWidth),
      String(cropHeight),
    ],
  };
}

function formatNumber(value: number): string {
  return String(value).replace(/^-0$/, '0');
}

function getOperations(adjustments: XmpAdjustments): Operation[] {
  const operations: Operation[] = [];
  const cropOperation = getCropOperation(adjustments);
  if (cropOperation !== undefined) {
    operations.push(cropOperation);
  }
  if (adjustments.cropAngle !== undefined && adjustments.cropAngle !== 0) {
    operations.push({
      name: 'rotate',
      values: [formatNumber(adjustments.cropAngle)],
    });
  }
  if (adjustments.exposure !== undefined && adjustments.exposure !== 0) {
    operations.push({
      name: 'exposure',
      values: [formatNumber(adjustments.exposure)],
    });
  }
  if (adjustments.temperature !== undefined && adjustments.temperature !== 0) {
    operations.push({
      name: 'temperature',
      values: [formatNumber(adjustments.temperature)],
    });
  }
  if (adjustments.tint !== undefined && adjustments.tint !== 0) {
    operations.push({
      name: 'tint',
      values: [formatNumber(adjustments.tint)],
    });
  }
  return operations;
}

function getSetValue(operations: readonly Operation[]): string {
  return operations
    .map((operation) => `${operation.name}:${operation.values.join(':')}`)
    .join(';');
}

function assertSingleGeometryOperation(operations: readonly Operation[]) {
  const geometryOperations = operations.filter((operation) =>
    ['crop', 'flip', 'rotate'].includes(operation.name)
  );
  if (geometryOperations.length > 1) {
    throw new Error(
      'Only one geometry operation is supported per file for now'
    );
  }
}

async function main(): Promise<void> {
  const rawPath = path.resolve(untildify(cliArgs.rawPath));
  const xmpPath = path.resolve(
    untildify(cliArgs.xmp ?? replaceExtension(rawPath, '.xmp'))
  );
  const outputPath = path.resolve(
    untildify(cliArgs.output ?? replaceExtension(rawPath, '.photo-edit'))
  );
  const templatePath = path.resolve(untildify(cliArgs.template));
  const xmp = await fs.readFile(xmpPath, 'utf8');
  const operations = getOperations(parseXmpAdjustments(xmp));
  if (operations.length === 0) {
    throw new Error(`No supported Lightroom edits found in ${xmpPath}`);
  }
  assertSingleGeometryOperation(operations);

  const setValue = getSetValue(operations);
  if (cliArgs['dry-run']) {
    console.log(setValue);
    return;
  }

  const toolPath = path.resolve(
    import.meta.dirname,
    '../../bin/symlinks/photo-edit-create'
  );
  const args = [
    '--raw',
    rawPath,
    '--output',
    outputPath,
    templatePath,
    '--set',
    setValue,
  ];
  if (cliArgs.force) {
    args.unshift('--force');
  }
  execFileSync(toolPath, args, { stdio: 'inherit' });
}

await run(main);
