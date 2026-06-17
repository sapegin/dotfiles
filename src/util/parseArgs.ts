import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { DOTFILES_DIR } from './consts.ts';
import { log } from './theme.ts';

interface BaseDefinition<Name extends string> {
  readonly name: Name;
  readonly alias?: string;
  readonly required?: boolean;
}

interface StringDefinition<
  Name extends string = string,
> extends BaseDefinition<Name> {
  readonly type?: 'string';
  readonly positional?: boolean;
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

function getToolName(): string {
  return path.basename(process.argv[1]).replace(/\.(?:js|ts)$/, '');
}

function showHelp(toolName: string): void {
  try {
    execFileSync(path.join(DOTFILES_DIR, 'bin/help'), [toolName], {
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

function isFlag(arg: string): boolean {
  return arg.startsWith('--');
}

function isPositionalDefinition(
  definition: ArgDefinition
): definition is StringDefinition {
  return 'positional' in definition && definition.positional === true;
}

function getOptionName(arg: string): string | undefined {
  if (arg.startsWith('--')) {
    return arg.slice('--'.length).split('=', 1)[0];
  }
  if (/^-[^-]$/.test(arg)) {
    return arg.slice('-'.length);
  }
}

function isOption(
  arg: string,
  definitionsByOptionName: ReadonlyMap<string, ArgDefinition>
): boolean {
  const optionName = getOptionName(arg);
  return optionName !== undefined && definitionsByOptionName.has(optionName);
}

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

/**
 * Minimal declarative command line arguments parser.
 */
export function parseArgs<const Definitions extends readonly ArgDefinition[]>(
  definitions: Definitions,
  args = process.argv.slice(2)
): ParsedArgs<Definitions> {
  const toolName = getToolName();
  const definitionsByOptionName = new Map<string, ArgDefinition>();
  for (const definition of definitions) {
    if (isPositionalDefinition(definition)) {
      continue;
    }
    definitionsByOptionName.set(definition.name, definition);
    if (definition.alias !== undefined) {
      definitionsByOptionName.set(definition.alias, definition);
    }
  }

  // Positional arguments are consumed left-to-right in declaration order.
  const positionalDefinitions = definitions.filter(isPositionalDefinition);
  const values: Record<string, unknown> = {};
  const seen = new Set<string>();
  let positionalIndex = 0;

  for (const definition of definitions) {
    if ('default' in definition) {
      values[definition.name] = definition.default;
    }
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      showHelp(toolName);
      process.exit(0);
    }

    if (arg.startsWith('--no-')) {
      const name = arg.slice('--no-'.length);
      const definition = getDefinition(definitionsByOptionName, name, toolName);
      if (definition.type !== 'boolean') {
        fail(`Option --${name} is not a boolean flag`, toolName);
      }
      values[definition.name] = false;
      seen.add(definition.name);
      continue;
    }

    if (isFlag(arg)) {
      const flag = arg.slice('--'.length);
      const separatorIndex = flag.indexOf('=');
      const hasInlineValue = separatorIndex !== -1;
      const rawName = hasInlineValue ? flag.slice(0, separatorIndex) : flag;
      const inlineValue = hasInlineValue ? flag.slice(separatorIndex + 1) : '';
      const definition = getDefinition(
        definitionsByOptionName,
        rawName,
        toolName
      );
      if (definition.type === 'boolean') {
        if (hasInlineValue) {
          fail(`Option --${rawName} does not take a value`, toolName);
        }
        values[definition.name] = true;
      } else {
        let value = inlineValue;
        if (hasInlineValue === false) {
          if (
            index + 1 >= args.length ||
            isOption(args[index + 1], definitionsByOptionName)
          ) {
            fail(`Missing value for --${rawName}`, toolName);
          }
          value = args[index + 1];
          index += 1;
        }
        values[definition.name] = parseFlagValue(
          definition,
          definition.name,
          value,
          toolName
        );
      }
      seen.add(definition.name);
      continue;
    }

    if (/^-[^-]$/.test(arg)) {
      const rawName = arg.slice('-'.length);
      const definition = getDefinition(
        definitionsByOptionName,
        rawName,
        toolName
      );
      if (definition.type === 'boolean') {
        values[definition.name] = true;
      } else {
        if (
          index + 1 >= args.length ||
          isOption(args[index + 1], definitionsByOptionName)
        ) {
          fail(`Missing value for -${rawName}`, toolName);
        }
        values[definition.name] = parseFlagValue(
          definition,
          definition.name,
          args[index + 1],
          toolName
        );
        index += 1;
      }
      seen.add(definition.name);
      continue;
    }

    if (positionalIndex >= positionalDefinitions.length) {
      fail(`Unexpected argument: ${arg}`, toolName);
    }
    const positionalDefinition = positionalDefinitions[positionalIndex];
    values[positionalDefinition.name] = parseStringValue(
      positionalDefinition,
      positionalDefinition.name,
      arg,
      toolName
    );
    seen.add(positionalDefinition.name);
    positionalIndex += 1;
  }

  for (const definition of definitions) {
    if (
      definition.required === true &&
      seen.has(definition.name) === false &&
      values[definition.name] === undefined
    ) {
      const label = isPositionalDefinition(definition)
        ? `argument ${definition.name}`
        : `option --${definition.name}`;
      fail(`Missing required ${label}`, toolName);
    }
  }

  return values as ParsedArgs<Definitions>;
}
