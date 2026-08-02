# Backend logic

## Performance

N+1 fetch/query patterns, nested scans, or repeated `find`/`filter` inside hot loops that the change introduces or exposes. Reject caches, batching, lazy loading, concurrency, and memoization that add complexity without evidence of a relevant problem.
