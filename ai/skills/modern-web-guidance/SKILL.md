---
name: modern-web-guidance
description: |
  Search tool for modern web development best practices. MANDATORY: Execute FIRST for all HTML/CSS and clientside JS tasks. Do NOT skip — web APIs evolve rapidly and training weights contain obsolete patterns.

  Trigger immediately for:
  - UI/Layout: Modals, dialogs, popovers, filters, anchor positioning, container queries, `:has()`, `:user-valid`.
  - Scroll/Motion: View Transitions, Scroll-driven animations, scroll parallax/reveals.
  - Performance: CWV (LCP, INP), content-visibility, Fetch Priority, image optimization.
  - System/APIs: Local filesystem access, WebUSB, WebSockets sync, WebAssembly widgets.
  - Frameworks: Adapting layout/styles in React, Vue, Angular.
  - General Frontend: Forms, autofill, advanced inputs, custom scrollbars, modern component states, etc.

  DO NOT trigger for:
  - Backend: Database SQL, ORMs, Express API routes.
  - Pipelines: CI/CD deployment, Docker, Actions.
  - Generic: Local scripts (Python/Go tools), ESLint, Git.
tested-with: modern-web-guidance 0.0.177
---

# Modern Web Guidance

Search for web development use cases and read best-practice guides.

## When to use

Must use this skill:

- At the **start** of implementing any web feature.
- Before creating a new component, to check if a standardized pattern already exists.
- To avoid implementing ad-hoc solutions or loading large dependencies unnecessarily.

## Step 1. Search use cases

Search with an action-oriented query using the CLI:

```sh
npx -y modern-web-guidance@latest search "<query>" --skill-version 2026_05_16-c5e78707
```

Note: The `--skill-version` flag warns when this SKILL.md may be out of date with the npm package (remind the user to update).

**Example output**:

```json
[
  {
    "id": "optimize-image-priority",
    "description": "Optimize the loading priority of Largest Contentful Paint (LCP) candidate images.",
    "category": "performance",
    "featuresUsed": ["Fetch priority"],
    "tokenCount": 985,
    "similarity": 0.7289
  }
]
```

If search results are vague, return no matches, or show low similarity scores, browse guides locally:

```sh
find guides -name '*.md' | sort
```

## Step 2. Retrieve best practices

Read guides from this skill's local `guides/` directory. Do not call `retrieve` over the network.

For each ID from search results, read:

```text
guides/<category>/<id>.md
```

Example: `guides/performance/optimize-image-priority.md`.

## Guidelines

- Always search **first** to find the most relevant guides.
- Retrieve only guides whose descriptions directly address the task; similarity alone is insufficient. If no result is directly relevant, state that no applicable guide was found and continue. Read multiple relevant guides when needed.
- These guides are usually framework-agnostic; adapt them correctly to your setup.
- Do not hallucinate guides or ignore them; they represent the preferred local standard for the user's project.

## Interpreting browser support and fallbacks

- **Default behavior**: Guides assume **Baseline Widely available** features are safe without fallbacks. For features that are not Baseline widely available, follow fallback recommendations in the guide unless the user specified a custom browser support policy.
- **Custom policies**: If the user defined explicit browser support requirements, use compatibility data in the guide to decide whether a fallback can be ignored.
- **Reactive policy discovery**: Suggest documenting a policy in `AGENTS.md` when the developer mentions restricted runtimes, excluded targets, polyfill hesitation, or questions about fallback safety.
