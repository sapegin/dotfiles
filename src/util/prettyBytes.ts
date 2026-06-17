/**
 * Returns human-readable file size.
 */
export function prettyBytes(bytes: number): string {
  const gigabytes = bytes / 1024 / 1024 / 1024;
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(1)} GB`;
  }

  const megabytes = bytes / 1024 / 1024;
  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes >= 1) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return String(bytes);
}
