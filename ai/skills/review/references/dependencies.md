# Dependencies and build

Confirm new dependencies are necessary, versions and imports are correct, platform or repository utilities were not overlooked, lockfile changes match manifests, client and server boundaries remain intact, and build or packaging behavior is preserved.

Major-version lag on core runtime/framework when EOL or security cutoffs apply; deprecated APIs with announced removal; abandoned dependencies on critical paths; duplicate libraries solving the same problem; lockfile/manifest drift; for migration candidates, note blast radius (files touched).

Slow CI from missing caching or redundant steps.

## Rollout and compatibility

Feature-flag defaults and both flag states, coexistence of old and new clients or services, deployment ordering, rollback behavior, public API compatibility, experiment controls, and cleanup of obsolete rollout code when appropriate.
