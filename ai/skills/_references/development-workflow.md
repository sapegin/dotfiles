# Development workflow setup

Use this reference for `review`, `deslop`, `finalize`, and `finish`.

## Target

Read applicable repository instructions and resolve the target with `~/dotfiles/bin/branch-diff`:

| Invocation | Arguments | Output scope |
| --- | --- | --- |
| Standalone `review` | Zero or one file path or commit SHA, passed exactly as supplied | Review starting point |
| Standalone `deslop` | Zero or one file path or commit SHA, passed exactly as supplied | Complete review target |
| Standalone `finalize` or any phase of `finish` | `--include-uncommitted` | Complete task changeset, including working-tree edits |

If the command fails, ask for clarification. Identify task changes and preserve unrelated user work.

Under `finish`, establish the target and requirements once. Reuse context already established in the conversation; refresh the target output after edits before the next phase. Each phase reads the current changes and any additional surrounding context it needs. Follow `finish`’s phase transitions instead of stopping at a child skill’s completion output. Standalone skills keep their existing output and completion behavior.

## Requirements and decisions

For `review` and `deslop`, establish intended behavior from explicit requirements, approved decisions, callers, tests, types, schemas, and documentation. Do not infer requirements solely from the changed implementation. Implementation descriptions, including pull request descriptions, are context unless they record an approved requirement change. Ask about unresolved requirement conflicts before reporting findings. `finalize` uses this context only for housekeeping.

Honor approved and ignored findings across phases. Revisit a decision only with new material evidence, explained before requesting approval. Approval of one fix does not authorize further fixes, commits, or publication.

## Verification

Reuse successful checks only when their command, result, and checked state are known and relevant code, configuration, dependency, and environment inputs remain unchanged. Otherwise refresh the evidence or mark it stale or unknown. Label reused results as earlier evidence. Follow the active skill’s validation requirements and repository instructions.
