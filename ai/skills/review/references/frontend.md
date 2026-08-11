# Frontend and UI

For UI changes that may touch accessibility patterns, read the [Accessibility Coding Guidelines](../../_references/modern-web-guidance/accessibility/accessibility.md).

For React components, Next.js pages, or client rendering changes, read the [React best practices index](../../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change. Raise performance findings only when the changed path has a plausible frequency, scale, or user-visible cost.

## Accessibility

Review at product and flow level, not only individual elements. Trace how the affected UI fits the broader experience.

### Document structure and navigation

Landmark regions (`header`, `nav`, `main`, etc.) consistent across views; heading hierarchy that forms a coherent outline per route (no skipped levels, no styled non-headings); skip links or equivalent bypass for repeated chrome; `lang` on `<html>` and inline language switches where content locale changes.

### Focus and keyboard flows

Tab order that matches visual layout across the full affected flow, not only one component. Focus moves predictably on route change, modal open/close, drawer open/close, and async content swap — including restoration to a sensible target after dismiss or back navigation. Hidden or off-screen views (`inert`, `aria-hidden`, stacked panels, tabs, wizards) do not leak focus or screen-reader navigation. Nested overlays expose a clear escape path. No positive `tabindex` values; focusable elements are not hidden from assistive tech.

### Shared components and consistency

Shared UI primitives (buttons, links, inputs, dialogs, toasts, tables, menus) expose a consistent accessible contract across the product. Flag when the change introduces a third way to solve the same interaction or breaks an established pattern other screens rely on.

### Dynamic updates and announcements

Loading, success, error, and validation feedback is announced without relying on visual change alone. Live-region and toast strategies are consistent (politeness level, deduplication, not stealing focus unnecessarily). Route or major view changes give screen-reader users equivalent context to sighted users.

### Complex widgets and content

Data tables, sortable or virtualized lists, comboboxes, date pickers, carousels, and multi-step flows remain operable by keyboard and expose correct names, states, and relationships. Charts and other non-text visuals have a text equivalent or data table when the information is essential. Video/audio have captions or transcripts when the product serves that media type.

### Visual design constraints

Color is not the only means of conveying state; contrast and focus indicators work with the theme/design tokens in use, not only in isolation on one control. `prefers-reduced-motion` and high-contrast or forced-colors preferences are honored at layout/theme level where motion or color carries meaning. Content reflows and remains usable at 200% zoom without horizontal trapping or loss of function; touch targets meet size expectations where the UI is pointer-driven.

## Forms and user input

Validation timing, normalization, duplicate submission, server-error mapping, unsaved input, autofill, password managers, and equivalent keyboard submission behavior.

## Rendering and navigation

Server/client consistency, nondeterministic rendering, component identity, hook and effect behavior, deep links, refresh and back/forward behavior, query preservation, scroll and focus restoration, layout shifts, overflow, zoom, long content, and supported viewport or color modes.

## Performance and scale

Raise performance findings only when the changed path has a plausible scale, frequency, or user-visible cost. Check request waterfalls, unbounded work or storage, repeated computation, unnecessary rendering, memory or resource leaks, bundle growth, missing code-splitting on rarely-hit routes, and optimizations whose complexity exceeds their benefit.
