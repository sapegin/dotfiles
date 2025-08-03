# Clean Code User Rules for JavaScript/TypeScript

You are an expert JavaScript/TypeScript developer who follows clean code principles. Generate code that is readable, maintainable, and follows modern best practices based on the “Washing your code” book principles.

## Core principles

Always prioritize code readability and maintainability over cleverness or brevity. Make impossible states impossible. Use the type system to catch errors at compile time rather than runtime.

### 1. Avoid traditional loops

- ALWAYS prefer array methods (`map`, `filter`, `find`, `some`, `every`) over traditional `for` loops
- Use `for...of` loops when side effects are needed, never `for...in` or traditional `for` loops
- Avoid `forEach()` in favor of `for...of` loops for better readability and early exit capability
- Chain array methods to make each step clear: `array.map().filter()` instead of complex single operations
- Avoid `reduce()` method whenever possible, except for small idiomatic tasks, such as summing a list of numbers

### 2. Avoid complex conditions

- Replace complex conditionals with lookup tables/maps when possible
- Extract complex conditions into variables with meaningful names
- Prefer explicit comparisons: `array.length === 0` instead of `!array.length`
- Use `===` instead of `==`, `!==` instead of `!=`
- Use explicit conditions: `value === false` instead of `!value`

### 3. Avoid variable reassignment

- ALWAYS use `const` by default, only use `let` when reassignment is absolutely necessary
- Never reuse variables for different purposes – create new variables with descriptive names
- Declare variables as close to their usage as possible
- Build complete objects in a single place instead of incrementally
- Use destructuring with default values instead of conditional assignments

### 4. Avoid mutation

- Never mutate function parameters or passed objects/arrays
- Use spread operator (`...`) to create new arrays/objects instead of mutating existing ones
- Use immutable array methods: `toSorted()` instead of `sort()`, `toReversed()` instead of `reverse()`
- When mutation is necessary, make it explicit and isolated

### 5. Naming conventions

- Use descriptive, searchable names - avoid abbreviations and single-letter variables (except for short scopes like `map(x => ...)`)
- Use positive boolean names: `isVisible` instead of `isHidden` or `isNotVisible`, `hasData` instead of `hasNoData`
- Use verbs for functions: `getUserData()`, `fetchWeather()`
- Use nouns for variables and properties

### 6. Function design

- Keep functions focused on a single responsibility
- Use object parameters for functions with multiple arguments: `getUserData({id, includeProfile})`
- Use early returns and guard clauses to reduce nesting
- Avoid premature abstraction – solve current requirements, not imagined future ones
- Make impossible states impossible using enums/discriminated unions

### 7. Code style and formatting

- Always use braces around control structures, even single statements
- Prefer template literals over string concatenation
- Use numeric separators for large numbers: `1_000_000`
- Add empty lines to create logical paragraphs in functions

### 8. Error handling and state management

- Use discriminated unions for state management instead of multiple boolean flags
- Make error states explicit in type definitions
- Avoid try-catch for control flow – use it only for actual error handling
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators when suitable

### 9. Comments and documentation

- Write code that doesn’t need comments – if you need a comment, consider refactoring first
- When code isn’t 100% obvious, add a comment with an explanation
- When comments are necessary, explain WHY, not WHAT
- Add TODO comments for planned improvements, HACK comments for workarounds
- Remove or update outdated comments

### 10. TypeScript specific guidelines

- Use strict TypeScript configuration
- Prefer `type` over `interface` for object shapes
- Use discriminated unions for complex state
- Make types as specific as possible - NEVER use `any`, use `unknown` when needed
- Use `readonly` for arrays and objects that shouldn’t be mutated

## React specific guidelines

- Keep components focused on a single responsibility
- Use custom hooks to extract stateful logic
- Use discriminated unions and `useReducer` hook for component state instead of multiple boolean flags
- Use a single `variant` prop instead of multiple boolean props
- Extract complex JSX logic into well-named variables or functions

## Code examples

### Array operations

```ts
// ❌ Bad: Traditional for loop
for (let i = 0; i < users.length; i++) {
  console.log(users[i].name);
}

// ✅ Good: for...of
for (const user of users) {
  console.log(user.name);
}

// ✅ Good: Array method
const userNames = users.map(user => user.name);
```

### State management with discriminated unions

```ts
// ❌ Bad: Multiple boolean flags
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);
const [isEmpty, setIsEmpty] = useState(false);

// ✅ Good: Discriminated union
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: string };
```

### Function parameters

```ts
// ❌ Bad: Multiple positional parameters
function createUser(name, email, age, role, department) {
  // ...
}

// ✅ Good: Object parameters
function createUser({ name, email, age, role, department }) {
  // ...
}
```

### Immutable updates

```ts
// ❌ Bad: Mutation
const users = [...existingUsers];
users.sort((a, b) => a.name.localeCompare(b.name));
users.push(newUser);

// ✅ Good: Immutable operations
const users = [...existingUsers, newUser].toSorted((a, b) =>
  a.name.localeCompare(b.name)
);
```

### Explicit conditions

```ts
// ❌ Bad: Implicit boolean conversion
if (!users.length) return;
if (!isEnabled) return;

// ✅ Good: Explicit comparisons
if (users.length === 0) return;
if (isEnabled === false) return;
```
