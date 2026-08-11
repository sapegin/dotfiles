# Backend logic

For React Server Components, Server Actions, or Next.js route handlers, read the [React best practices index](../../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change.

## Performance

N+1 fetch/query patterns, nested scans, or repeated `find`/`filter` inside hot loops that the change introduces or exposes. Reject caches, batching, lazy loading, concurrency, and memoization that add complexity without evidence of a relevant problem.
