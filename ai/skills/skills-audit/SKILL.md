---
name: skills-audit
description: Audit every local skill for predictable behavior, sound structure, and prompt quality.
disable-model-invocation: true
---

Audit all skills under `ai/skills/`. Produce recommendations only; do not edit files during the audit.

## Process

1. Read the applicable `AGENTS.md` files and enumerate every `SKILL.md` under `ai/skills/`. Treat that inventory as the audit scope, including this skill.
2. Read both required rubrics in full:
   - [local prompt quality](../deslop/references/agent-skills.md)
   - [skill design and predictability](../review/references/agent-skills.md)
3. For each skill, read its `SKILL.md` and all Markdown references inside that skill’s directory. Follow links outside the directory only as far as needed to validate the context pointer, source of truth, and consistency with the skill.
4. Apply every relevant rubric item to every skill. Trace each distinct requirement across the skill’s sections and flag repeated meanings, even when the wording differs. Prefer one observable outcome or output contract over instructions for routine steps the model can infer. Retain prescribed methods only when they are non-obvious, required for correctness, or guard against a demonstrated failure mode. Verify commands, paths, links, dependencies, and repository conventions from local evidence. Do not infer a defect merely because one skill differs from another.
5. Compare the complete inventory for inconsistent terminology, structure, output contracts, guardrails, and handling of equivalent workflows. Identify repeated guidance that belongs in a shared reference and repeated deterministic operations that belong in a script; preserve repetition when the skills intentionally require independent behavior.
6. Try to disprove each candidate finding against the skill's full workflow, references, applicable instructions, and dependencies. Keep only findings with a concrete behavioral or maintenance consequence.
7. Produce the report only after every inventory item has been examined. Prefer the smallest recommendation that restores predictable behavior or a clear single source of truth; do not manufacture uniformity or generic prompt polish.

## Output

```md
### 1. {title} — {priority}

**Location:** {repository-relative paths with line references}

**Evidence:** {observed text or behavior}

**Consequence:** {concrete effect on execution or maintenance}

**Recommendation:** {smallest coherent correction}

## No-change observations

- {Important differences that were examined and found intentional, or `None.`}
```

Order findings by priority: high, medium, low, then suggestion. When there are no material findings, state `No material findings.`. Keep unrelated issues in separate findings and consolidate one shared root cause across affected skills into one finding.
