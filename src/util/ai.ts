const PERSONA_ELEMENT_PATTERN = /^<persona name="([a-z0-9]+(?:-[a-z0-9]+)*)">$/;
const PERSONA_END_ELEMENT = '</persona>';

/** Extract and validate the generated body of a canonical persona file. */
export function parsePersona(source: string, expectedName: string): string {
  const normalizedSource = source.replaceAll('\r\n', '\n').trim();
  const [heading, ...bodyLines] = normalizedSource.split('\n');

  if (heading !== `# ${expectedName}`) {
    throw new Error(
      `Persona ${expectedName} must start with "# ${expectedName}".`
    );
  }

  const body = bodyLines.join('\n').trim();
  if (body === '') {
    throw new Error(`Persona ${expectedName} has no instructions.`);
  }

  return body;
}

/** Replace the contents of persona elements inside Tone sections. */
export function generatePersonaSections(
  source: string,
  personas: ReadonlyMap<string, string>,
  sourceName = 'Markdown'
): string {
  const lines = source.split('\n');
  const output: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; ) {
    if (lines[lineIndex] !== '## Tone') {
      const line = lines[lineIndex];
      if (PERSONA_ELEMENT_PATTERN.test(line) || line === PERSONA_END_ELEMENT) {
        throw new Error(
          `${sourceName} has a persona element outside a Tone section.`
        );
      }

      output.push(line);
      lineIndex += 1;
      continue;
    }

    let sectionEnd = lineIndex + 1;
    while (
      sectionEnd < lines.length &&
      lines[sectionEnd].startsWith('## ') === false
    ) {
      sectionEnd += 1;
    }

    const startIndexes: number[] = [];
    const endIndexes: number[] = [];
    for (
      let sectionLineIndex = lineIndex + 1;
      sectionLineIndex < sectionEnd;
      sectionLineIndex += 1
    ) {
      if (PERSONA_ELEMENT_PATTERN.test(lines[sectionLineIndex])) {
        startIndexes.push(sectionLineIndex);
      } else if (lines[sectionLineIndex] === PERSONA_END_ELEMENT) {
        endIndexes.push(sectionLineIndex);
      }
    }

    if (startIndexes.length === 0 && endIndexes.length === 0) {
      output.push(...lines.slice(lineIndex, sectionEnd));
      lineIndex = sectionEnd;
      continue;
    }
    if (
      startIndexes.length !== 1 ||
      endIndexes.length !== 1 ||
      endIndexes[0] < startIndexes[0]
    ) {
      throw new Error(
        `${sourceName} must have one complete persona element per Tone section.`
      );
    }

    const startIndex = startIndexes[0];
    const endIndex = endIndexes[0];
    const personaName = lines[startIndex].match(PERSONA_ELEMENT_PATTERN)?.[1];
    const persona =
      personaName === undefined ? undefined : personas.get(personaName);
    if (personaName === undefined || persona === undefined) {
      throw new Error(
        `${sourceName} references unknown persona "${personaName ?? ''}".`
      );
    }

    output.push(
      ...lines.slice(lineIndex, startIndex + 1),
      '',
      ...persona.split('\n'),
      '',
      PERSONA_END_ELEMENT,
      ...lines.slice(endIndex + 1, sectionEnd)
    );
    lineIndex = sectionEnd;
  }

  return output.join('\n');
}
