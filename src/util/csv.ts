/**
 * Minimal RFC 4180-ish CSV helpers for flat exports (Notion database CSV).
 *
 * Supports quoted fields, doubled quotes inside quotes, and `\r\n` / `\n`
 * record separators. Does not support embedded newlines inside fields.
 */

/** Split one CSV record into fields. */
export function parseCsvRecord(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields;
}

/** Parse a whole CSV document into row arrays (including the header row). */
export function parseCsv(text: string): string[][] {
  const normalized = text
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/\n+$/u, '');
  if (normalized === '') {
    return [];
  }
  return normalized.split('\n').map((line) => parseCsvRecord(line));
}

/**
 * Parse CSV into objects keyed by the header row. Missing cells become `''`.
 */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return [];
  }

  const [header, ...body] = rows;
  return body.map((row) => {
    const record: Record<string, string> = {};
    for (const [index, name] of header.entries()) {
      record[name] = row[index] ?? '';
    }
    return record;
  });
}
