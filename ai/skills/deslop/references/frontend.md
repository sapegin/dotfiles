# Frontend and web

## Performance

Raise performance findings only when the reviewed code path has a plausible frequency or user-visible cost; do not prescribe memoization, caching, or concurrency without evidence.

## Accessibility defects

Use links for navigation and buttons for actions instead of clickable `div`/`span` elements. Verify accessible names, labels and error associations, keyboard operation, visible focus, focus placement, dialogs, status announcements, image alternatives, contrast, reduced motion, and native semantics before ARIA.

## Obsolete web patterns

Libraries and hand-rolled JS where platform HTML/CSS APIs suffice (dialogs, popovers, scroll effects, forms, etc.), outdated layout approaches, and unnecessary dependencies.
