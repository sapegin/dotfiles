# Frontend and web

For HTML, CSS, or client-side JavaScript changes, read the [web guide index](../../_references/modern-web-guidance/Index.md) when the changed code may touch patterns these guides cover, then load only the specific linked guides relevant to the change.

For React components, Next.js pages, or client rendering changes, read the [React best practices index](../../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change. Raise performance findings only when the changed path has a plausible frequency or user-visible cost; do not prescribe memoization, caching, or concurrency without evidence.

## Accessibility defects

Use links for navigation and buttons for actions instead of clickable `div`/`span` elements. Verify accessible names, labels and error associations, keyboard operation, visible focus, focus placement, dialogs, status announcements, image alternatives, contrast, reduced motion, and native semantics before ARIA.

## Obsolete web patterns

Libraries and hand-rolled JS where platform HTML/CSS APIs suffice (dialogs, popovers, scroll effects, forms, etc.), outdated layout approaches, and unnecessary dependencies.
