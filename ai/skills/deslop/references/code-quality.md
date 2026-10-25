# Code quality

Apply to the code under review. For diffs, prioritize issues introduced or exposed by the change.

## Structure and abstraction

- **Defensive theater:** Remove abnormal checks on trusted paths, repeated validation at internal boundaries, catch-and-rethrow blocks, swallowed failures, fallback values that conceal defects, quiet parsing or decoding failures without an explicit compatibility requirement, and error handling that branches on unstable message text instead of codes or identifiers.
- **Redundant compatibility:** Remove aliases, fallbacks, migration paths, version branches, and legacy behavior added for consumers or versions that do not exist.

## Dead and incomplete code

- **Dead or ceremonial code:** Unreachable branches, redundant state, unused options, placeholder constants, no-op handlers, and functions that merely rename or forward another function.
- **Misleading completeness:** Hard-coded sample data, placeholder success responses, silent no-op branches, and unfinished behavior presented as complete. Off-by-one logic, empty-collection assumptions, unchecked array indexing, and timezone/locale/date handling that ignores obvious edge cases. Status enums or discriminated unions with `default:` branches that silently no-op.

## Clarity

- **Unnecessary repetition:** Consolidate repeated values, calculations, or code introduced or exposed directly by the target when they plainly represent the same concept. Do not generalize incidental similarity or search unchanged systems for duplication.
