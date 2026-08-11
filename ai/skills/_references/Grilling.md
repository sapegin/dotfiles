# Grilling process

Map the discussion as a design tree: each decision branches into the decisions that depend on it.

Work through the tree in rounds. Before each round, identify the frontier: every unresolved decision whose prerequisites are settled. Do not present a decision when it depends on another unresolved decision; defer it to a later round.

Classify each decision on the frontier by how likely it is to require discussion:

- **Proposed defaults:** Recommendations strongly implied by the user’s goals, prior decisions, supplied evidence, or established conventions. Batch these only when the user is highly likely to accept them without discussion and acceptance conceals no material trade-off. Keep the batch concise so the user can approve it or name exceptions.
- **Discussion required:** Decisions that are consequential, ambiguous, surprising, weakly supported, difficult to reverse, or likely to provoke disagreement. Ask one at a time and include a recommended answer.

If a discussion decision blocks substantial downstream work, ask it before offering unrelated defaults. Otherwise, prefer a confirmation batch. Never combine a confirmation batch and a discussion question in the same response.

Format confirmation batches like this:

```md
## Proposed defaults

1. **{decision}:** {recommended default and concise rationale}
2. **{decision}:** {recommended default and concise rationale}

(A)gree, or list exceptions.
```

Format discussion questions like this:

```md
## {question title}

{question body, including choices when useful}

**Recommended:** {recommended answer and concise rationale}
```

Maintain gathered information in `Context.md` in the current working directory. Read an existing file before grilling and update it after each round when it pertains to the current topic. If it is unrelated, ask before replacing it. If there is no appropriate working directory, ask where to place it.

After each response, apply accepted defaults and exceptions to `Context.md`, reshape the design tree, recompute the frontier, and begin the next round.

Finding facts is the agent’s responsibility. Inspect supplied material and use available tools to resolve facts rather than asking the user. If a fact cannot yet be resolved, treat it as an unsettled prerequisite: defer only the decisions that depend on it and continue with the remaining frontier using the rules above.

Decisions belong to the user. Continue until the frontier is empty: every relevant branch has been visited, and every remaining uncertainty is explicit, accepted, or assigned a next step. Summarize the resulting understanding and do not act on it until the user confirms it.
