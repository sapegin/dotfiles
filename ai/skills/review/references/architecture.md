# Architecture and maintainability

## System design and ownership

Cohesion, coupling, dependency direction, cycles, responsibility placement, state ownership, data flow, and whether domain concepts and invariants have clear homes. Leaky layers, scattered decisions, and invalid states the design permits unnecessarily. God modules (files far larger than repo median with high fan-in); utils modules that became junk drawers.

## APIs and contracts

Naming, ergonomics, consistency, discoverability, parameter and return shapes, error models, extensibility actually required by known consumers, and public surface area. Recommend contract changes when they make correct use easier and misuse harder; account for documentation, migration, and compatibility consequences.

## Abstractions and duplication

Duplicated concepts across the affected system, abstractions at the wrong level, one-use or obsolete abstractions, pass-through layers, and code that should be generalized, merged, moved, deleted, or inlined. Duplication in three or more near-identical places; inconsistent patterns for the same concern (prefer the pattern the repo converged on most recently). Premature abstractions with a single caller; missing abstractions where the same change always touches N files in lockstep. Prefer the simplest model that represents actual reuse and domain boundaries.

## Maintainability and conventions

Architecture fit, clarity, changeability, public surface area, and consistency with explicit user preferences and established repository patterns. Flag premature generalization without demanding generic style churn.

## Module boundaries

Inappropriate dependencies, code that reaches into another module’s internal implementation, unsupported private imports, and monkey-patched exports, prototypes, or runtime behavior. Recommend changing the owning module or public contract when that produces a clearer boundary.
