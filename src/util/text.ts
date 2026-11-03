/** Capitalize only the first character; leave the rest unchanged. */
export function capitalizeFirst(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Capitalize only the first character; lowercase the rest (sentence case). */
export function toSentenceCase(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return capitalizeFirst(text.toLowerCase());
}

/** Title-case hyphen-separated parts: `foo-bar` → `Foo Bar`. */
export function toTitleCase(text: string): string {
  return text
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => capitalizeFirst(part))
    .join(' ');
}

/** Convert the given text to kebab-case. */
export function toKebabCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(/['’]+/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}
