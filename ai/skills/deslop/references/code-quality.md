# Code quality

Apply to the code under review. For diffs, prioritize issues introduced or exposed by the change.

## Comments

- **Comment noise:** Remove comments that narrate syntax, repeat names, or over-explain obvious code. Keep JSDoc-style comments that describe functions when they are an existing file or project convention, even when a brief description restates the function name. Do not flag JSDoc on exported functions, methods, or types — brief exported API docs are intentional, even when they restate the name.
- **Missing context:** Add concise comments when code depends on non-obvious constraints, external knowledge, workarounds, or decisions that cannot be recovered from the code alone.
- **TODO comments:** Keep precise TODOs that document intentionally deferred functionality or known scope limitations; resolve or flag low-effort TODOs that can be completed safely within the current change.

## Structure and abstraction

- **Defensive theater:** Remove abnormal checks on trusted paths, repeated validation at internal boundaries, catch-and-rethrow blocks, swallowed failures, and fallback values that conceal defects.
- **Premature abstraction:** Reject one-use helpers, pass-through wrappers, factories, speculative options, generic frameworks, and extension points created for hypothetical future requirements.
- **Needless nesting:** Simplify deeply nested logic with guard clauses, early returns, or clearer decomposition when that improves readability.
- **Redundant compatibility:** Remove aliases, fallbacks, migration paths, version branches, and legacy behavior added for consumers or versions that do not exist.

## Dead and incomplete code

- **Dead or ceremonial code:** Unreachable branches, redundant state, unused options, placeholder constants, no-op handlers, and functions that merely rename or forward another function.
- **Misleading completeness:** Hard-coded sample data, placeholder success responses, silent no-op branches, and unfinished behavior presented as complete. Off-by-one logic, empty-collection assumptions, unchecked array indexing, and timezone/locale/date handling that ignores obvious edge cases. Status enums or discriminated unions with `default:` branches that silently no-op, types that represent impossible state combinations, and combinations of mutually exclusive booleans that should be a single state variable.

## Clarity

- **Magic values:** Replace unexplained numeric literals with named constants when the name captures a real constraint or domain concept; keep obvious local values inline.
- **Unnecessary repetition:** Consolidate repeated values, calculations, or code introduced or exposed directly by the target when they plainly represent the same concept. Do not generalize incidental similarity or search unchanged systems for duplication.
- **Clean-code violations:** Apply [Clean code for JavaScript/TypeScript](../../_references/JavaScript.md) when it improves the code under review without creating churn.
