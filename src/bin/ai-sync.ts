// Generate marked persona sections in global AI instructions and skills.
//
// - Update generated persona sections:
//
// `ai-sync`
//
// - Check whether generated persona sections are current:
//
// `ai-sync --check`

import fs from 'node:fs/promises';
import path from 'node:path';
import { generatePersonaSections, parsePersona } from '../util/ai.ts';
import { parseArgs } from '../util/args.ts';
import { dirs } from '../util/files.ts';
import { run } from '../util/tui.ts';

const AI_DIRECTORY = path.join(dirs.dotfiles, 'ai');

async function loadPersonas(): Promise<ReadonlyMap<string, string>> {
  const personaPaths = await Array.fromAsync(
    fs.glob(path.join(AI_DIRECTORY, 'personas/*.md'))
  );
  const personas = new Map<string, string>();

  for (const personaPath of personaPaths.toSorted()) {
    const personaName = path.basename(personaPath, '.md');
    const source = await fs.readFile(personaPath, 'utf8');
    personas.set(personaName, parsePersona(source, personaName));
  }

  return personas;
}

async function getTargetPaths(): Promise<string[]> {
  const skillPaths = await Array.fromAsync(
    fs.glob(path.join(AI_DIRECTORY, 'skills/*/SKILL.md'))
  );
  return [path.join(AI_DIRECTORY, 'AGENTS.md'), ...skillPaths.toSorted()];
}

async function main(): Promise<void> {
  const args = parseArgs([{ name: 'check', type: 'boolean', default: false }]);
  const personas = await loadPersonas();
  const changes: { path: string; generated: string }[] = [];

  for (const targetPath of await getTargetPaths()) {
    const source = await fs.readFile(targetPath, 'utf8');
    const relativePath = path.relative(dirs.dotfiles, targetPath);
    const generated = generatePersonaSections(source, personas, relativePath);
    if (generated !== source) {
      changes.push({ path: targetPath, generated });
    }
  }

  if (args.check) {
    if (changes.length > 0) {
      const stalePaths = changes
        .map(({ path: targetPath }) => path.relative(dirs.dotfiles, targetPath))
        .join('\n  ');
      throw new Error(`Generated persona sections are stale:\n  ${stalePaths}`);
    }
    console.log('Persona sections are current.');
    return;
  }

  for (const change of changes) {
    await fs.writeFile(change.path, change.generated);
    console.log(`Updated ${path.relative(dirs.dotfiles, change.path)}`);
  }

  if (changes.length === 0) {
    console.log('Persona sections are already current.');
  }
}

await run(main);
