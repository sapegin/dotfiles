import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs as parseNodeArgs } from 'node:util';
import { dirs } from './files.ts';
import { log } from './tui.ts';

interface BaseDefinition<Name extends string> {
  readonly name: Name;
  readonly alias?: string;
  readonly positional?: boolean;
  readonly required?: boolean;
}

interface StringDefinition<
  Name extends string = string,
> extends BaseDefinition<Name> {
  readonly type?: 'string';
  readonly default?: string;
  readonly values?: readonly string[];
}

interface BooleanDefinition<
  Name extends string = string,
> extends BaseDefinition<Name> {
  readonly type: 'boolean';
  readonly default?: boolean;
}

interface NumberDefinition<
  Name extends string = string,
> extends BaseDefinition<Name> {
  readonly type: 'number';
  readonly default?: number;
  readonly min?: number;
  readonly max?: number;
}

type ArgDefinition<Name extends string = string> =
  | StringDefinition<Name>
  | BooleanDefinition<Name>
  | NumberDefinition<Name>;

type ArgValue<Definition extends ArgDefinition> =
  Definition extends BooleanDefinition
    ? boolean
    : Definition extends NumberDefinition
      ? number
      : Definition extends { readonly values: readonly (infer Value)[] }
        ? Value
        : string;

type ParsedValue<Definition extends ArgDefinition> = Definition extends
  | { readonly required: true }
  | { readonly default: unknown }
  ? ArgValue<Definition>
  : ArgValue<Definition> | undefined;

export type ParsedArgs<Definitions extends readonly ArgDefinition[]> = {
  readonly [Definition in Definitions[number] as Definition['name']]: ParsedValue<Definition>;
};

interface NativeOptionConfig {
  readonly type: 'boolean' | 'string';
  readonly short?: string;
}

function getToolName(): string {
  return path.basename(process.argv[1]).replace(/\.(?:js|ts)$/, '');
}

function showHelp(toolName: string): void {
  try {
    execFileSync(path.join(dirs.dotfiles, 'bin/help'), [toolName], {
      stdio: 'inherit',
    });
  } catch {
    // The validation error above is enough when help is unavailable.
  }
}

function fail(message: string, toolName: string): never {
  log.error(message);
  console.error();
  showHelp(toolName);
  process.exit(1);
}

function isPositionalDefinition(definition: ArgDefinition): boolean {
  return definition.positional === true;
}

function parseStringValue(
  definition: StringDefinition,
  name: string,
  value: string,
  toolName: string
): string {
  if (definition.values?.includes(value) === false) {
    fail(`Invalid value for --${name}: ${value}`, toolName);
  }
  return value;
}

function parseNumberValue(
  definition: NumberDefinition,
  name: string,
  value: string,
  toolName: string
): number {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) === false) {
    fail(`Invalid value for --${name}: ${value}`, toolName);
  }
  if (definition.min !== undefined && numberValue < definition.min) {
    fail(`Value for --${name} must be at least ${definition.min}`, toolName);
  }
  if (definition.max !== undefined && numberValue > definition.max) {
    fail(`Value for --${name} must be at most ${definition.max}`, toolName);
  }
  return numberValue;
}

function parseFlagValue(
  definition: StringDefinition | NumberDefinition,
  name: string,
  value: string,
  toolName: string
): string | number {
  return definition.type === 'number'
    ? parseNumberValue(definition, name, value, toolName)
    : parseStringValue(definition, name, value, toolName);
}

function getNativeOptions(
  definitions: readonly ArgDefinition[]
): Record<string, NativeOptionConfig> {
  const options: Record<string, NativeOptionConfig> = {};
  for (const definition of definitions) {
    if (isPositionalDefinition(definition)) {
      continue;
    }

    const option = {
      type: definition.type === 'boolean' ? 'boolean' : 'string',
      ...(definition.alias?.length === 1 ? { short: definition.alias } : {}),
    } as const;
    options[definition.name] = option;
    if (definition.alias !== undefined) {
      options[definition.alias] = { type: option.type };
    }
  }
  return options;
}

interface ParsedOptionToken {
  readonly kind: 'option';
  readonly name: string;
  readonly rawName: string;
  readonly value?: string;
}

interface ParsedPositionalToken {
  readonly kind: 'positional';
}

type ParsedArgsWithTokens = ReturnType<typeof parseNodeArgs> & {
  readonly tokens: readonly (ParsedOptionToken | ParsedPositionalToken)[];
};

function getDefinition(
  definitionsByOptionName: ReadonlyMap<string, ArgDefinition>,
  name: string,
  toolName: string
): ArgDefinition {
  const definition = definitionsByOptionName.get(name);
  if (definition === undefined) {
    fail(`Unknown option: --${name}`, toolName);
  }
  return definition;
}

/**
 * Minimal declarative command line arguments parser.
 */
export function parseArgs<const Definitions extends readonly ArgDefinition[]>(
  definitions: Definitions,
  args = process.argv.slice(2)
): ParsedArgs<Definitions> {
  const toolName = getToolName();
  if (args.includes('--help') || args.includes('-h')) {
    showHelp(toolName);
    process.exit(0);
  }

  const positionalDefinitions = definitions.filter(isPositionalDefinition);
  const definitionsByOptionName = new Map<string, ArgDefinition>();
  const values: Record<string, unknown> = {};

  for (const definition of definitions) {
    if ('default' in definition) {
      values[definition.name] = definition.default;
    }
    if (isPositionalDefinition(definition) === false) {
      definitionsByOptionName.set(definition.name, definition);
      if (definition.alias !== undefined) {
        definitionsByOptionName.set(definition.alias, definition);
      }
    }
  }

  let parsed: ParsedArgsWithTokens;
  try {
    parsed = parseNodeArgs({
      args,
      options: getNativeOptions(definitions),
      allowNegative: true,
      allowPositionals: true,
      tokens: true,
    }) as ParsedArgsWithTokens;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), toolName);
  }

  if (parsed.positionals.length > positionalDefinitions.length) {
    fail(
      `Unexpected argument: ${parsed.positionals[positionalDefinitions.length]}`,
      toolName
    );
  }

  for (const [index, value] of parsed.positionals.entries()) {
    const definition = positionalDefinitions[index];
    if (definition.type === 'boolean') {
      fail(`Argument ${definition.name} cannot be a boolean`, toolName);
    }
    values[definition.name] = parseFlagValue(
      definition,
      definition.name,
      value,
      toolName
    );
  }

  for (const token of parsed.tokens) {
    if (token.kind !== 'option') {
      continue;
    }

    const definition = getDefinition(
      definitionsByOptionName,
      token.name,
      toolName
    );
    if (definition.type === 'boolean') {
      values[definition.name] = token.rawName.startsWith('--no-') === false;
    } else {
      if (token.value === undefined) {
        fail(`Missing value for --${definition.name}`, toolName);
      }
      values[definition.name] = parseFlagValue(
        definition,
        definition.name,
        token.value,
        toolName
      );
    }
  }

  for (const definition of definitions) {
    if (definition.required === true && values[definition.name] === undefined) {
      const label = isPositionalDefinition(definition)
        ? `argument ${definition.name}`
        : `option --${definition.name}`;
      fail(`Missing required ${label}`, toolName);
    }
  }

  return values as ParsedArgs<Definitions>;
}
