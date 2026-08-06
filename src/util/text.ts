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
