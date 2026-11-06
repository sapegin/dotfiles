# Swift UI presentation

System-level Swift presentation: theme ownership, appearance update paths, and shared design boundaries.

## Theme and appearance architecture

- New color roles extend the theme source and loader; consumers keep using semantic tokens across AppKit and SwiftUI surfaces in the flow.
- Appearance changes refresh visible surfaces through the project’s established update path, including custom-drawn views that take a colors snapshot.
- SwiftUI and AppKit presentations of the same product chrome stay on one token vocabulary.

## Shared design boundaries

- Floating windows, title bars, surfaces, and type-size ladders live in (or move into) the shared design package when a second app or feature already needs them.
- Feature modules own product behavior; presentation primitives stay behind the design package’s public surface rather than leaking parallel implementations across apps.
