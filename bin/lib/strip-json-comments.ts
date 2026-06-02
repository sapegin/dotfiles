/**
 * Strips comments in a JSON file.
 */
export function stripJsonComments(json: string) {
  return (
    json
      // Remove /* */ comments
      .replaceAll(/\/\*[\s\S]*?\*\//g, '')
      // Remove // comments
      .replaceAll(/\/\/.*$/gm, '')
  );
}
