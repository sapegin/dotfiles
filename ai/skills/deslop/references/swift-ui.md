# Swift UI presentation

Local presentation literals and copy-paste in Swift AppKit or SwiftUI code.

## Literals

- Ad-hoc hex, sRGB triples, or unlabeled `NSColor` / SwiftUI `Color` literals where neighboring code already uses semantic theme tokens.
- Magic font sizes instead of the shared type-size ladder or a single named constant already used for that role nearby.
- Inline corner radii, borders, or weights that duplicate values already named beside the change.

## Local duplication

- A helper that only renames or forwards an existing shared design-package API.
- Speculative shared abstractions introduced for a single call site in the target.
