# Grilling process

Map the discussion as a design tree: each decision branches into the decisions that depend on it.

Work through the tree in rounds. Before each round, identify the frontier: every unresolved decision whose prerequisites are settled. Ask every question on that frontier in the same round, then wait for the user’s answers. Do not ask a question when its answer depends on another unresolved question in that round; defer it to a later round.

Number each question and include a recommended answer:

```md
## Q1. {question title}

{question body, including choices when useful}

**Recommended:** {recommended answer}
```

Maintain gathered information in `Context.md` in the current working directory. Read an existing file before grilling and update it after each round when it pertains to the current topic. If it is unrelated, ask before replacing it. If there is no appropriate working directory, ask where to place it.

After each response, update `Context.md`, reshape the design tree, recompute the frontier, and ask the next round.

Finding facts is the agent's responsibility. Inspect supplied material and use available tools to resolve facts rather than asking the user. If a fact cannot yet be resolved, treat it as an unsettled prerequisite: defer only the questions that depend on it and ask the rest of the frontier.

Decisions belong to the user. Continue until the frontier is empty: every relevant branch has been visited, and every remaining uncertainty is explicit, accepted, or assigned a next step. Summarize the resulting understanding and do not act on it until the user confirms it.
