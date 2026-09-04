---
name: writing-audit
description: Audit technical articles for factual correctness, current libraries and APIs, and best practices.
disable-model-invocation: true
---

Audit the supplied article for correctness, modernity, and best practices only. Prose quality — spelling, grammar, punctuation, clarity, voice — is out of scope. Produce findings only; do not edit unless the user approves fixes.

When needed, use the `web_search` and `web_fetch` tools, and load and follow the [librarian](../librarian/SKILL.md) skill.

## Target

Accept zero or one argument:

```text
/skill:writing-audit [<file-path>]
```

**With a file path:** read that file as the audit target. On approved fixes, edit the file in place.

**Without a file path:** ask the user to paste the article or supply a file path. Do not audit until text is provided.

## Process

1. Resolve the target according to **Target**. Read the full article once for audience, scope, and stated intent.
2. Inventory every factual claim, library or framework mention, API or language feature, configuration step, and fenced or inline code example. Audit technical substance only.
3. **Correctness** — verify claims and code against authoritative sources (specifications, official docs, release notes, repository evidence). Run fenced examples when the environment can execute them safely; otherwise trace them manually and mark unresolved uncertainty. Flag misleading simplifications, wrong defaults, broken examples, and steps that would fail as written.
4. **Modernity** — for each library, runtime, and API cited, confirm it still exists, is maintained, and matches current stable usage in the article’s stated environment (browser baseline, Node.js, framework version, etc.). Flag deprecated or removed APIs, legacy syntax superseded by platform features, version-specific advice that no longer applies, and libraries replaced by built-ins or better-maintained alternatives. Prefer current official docs and release notes over parametric knowledge.
5. **Best practices** — load only the [deslop](../deslop/SKILL.md) **Category checklists** that match topics the article covers. Treat each fenced or inline code example as the deslop review target; apply criteria to the example and its stated context, not as generic prose polish.
6. Try to disprove each candidate finding against the article’s full context, audience, and intentional simplifications. Keep only findings with a concrete reader consequence. Record intentional simplifications, acceptable trade-offs, and examined topics with no material issue for **No-change observations**.
7. Present **all** findings at once in **Output format**, ordered within each section by severity: blocker, high, medium, low, then suggestion. When every finding section is empty, output **Summary** and **No-change observations** only; use `None.` in **No-change observations** when step 6 recorded nothing worth noting.

## Output format

Use this structure. Replace only the placeholders.

```md
## Summary

{One paragraph: article scope, technologies covered, and overall audit posture — factual, not praise.}

## Correctness

### {n}. {short finding title} ({severity})

**Location:** {quote, heading, or line reference sufficient to locate the passage in the article}

**Evidence:** {what was checked and what authoritative source or execution showed}

**Consequence:** {concrete effect on a reader who follows the article}

**Recommendation:** {smallest correction that restores accuracy}

## Modernity

### {n}. {short finding title} ({severity})

**Location:** {locator}

**Evidence:** {current API, version, or replacement source}

**Consequence:** {concrete effect — broken code, deprecated path, misleading baseline}

**Recommendation:** {updated API, version note, or replacement approach}

## Best practices

### {n}. {short finding title} ({severity})

**Location:** {locator}

**Evidence:** {relevant deslop or linked reference criterion and how the article violates it}

**Consequence:** {concrete effect on code quality, security, accessibility, or maintainability}

**Recommendation:** {preferred pattern from the loaded references}

## No-change observations

- {Intentional simplifications, acceptable trade-offs, or topics examined with no material issue — or `None.`}
```

Formatting rules:

- Number findings consecutively across all finding sections, starting at 1. Do not restart numbering or use letter prefixes.
- Omit empty sections entirely.
- Keep each finding focused on one issue.
- Cite authoritative sources in **Evidence** when the finding depends on external facts.
- State confidence only when uncertainty is material; do not present guesses as facts.
- Do not add preambles, file summaries, or generic praise outside the template.
- When every finding section is empty, omit **Correctness**, **Modernity**, and **Best practices**; output **Summary** and **No-change observations** only.

When any finding section has entries, add:

```text
Fix (1, 3), fix (all), or tell what to do.
```

Interpret `1, 3` as approval to apply those corrections. Interpret `all` as approval to apply every recommendation.

**File mode:** edit the file in place on approval; confirm which passages changed. **Text mode:** reprint only the corrected passages unless the user asks for the full article.

## Guardrails

- Preserve the author’s voice, structure, and intentional simplifications unless they cause factual or practical harm.
- Do not invent biographical details, benchmarks, or compatibility claims without evidence.
- Prefer the smallest correction that fixes the issue.
- Do not audit or report prose quality: no spelling, grammar, punctuation, readability, voice, heading style, or word-choice findings. Do not suggest running spellcheck inline in the report.
- Do not recommend churn merely to match generic style; tie best-practice findings to loaded reference criteria.
- Security findings: reference secret type and location only; never reproduce secret values.
- Mark findings as suggestions when the article’s audience or scope justifies a deliberate trade-off; say why in **No-change observations** when declining to flag it.
