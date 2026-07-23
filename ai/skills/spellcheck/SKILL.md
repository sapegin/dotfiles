---
name: spellcheck
description: Proofread prose for spelling, grammar, punctuation, and clarity.
disable-model-invocation: true
---

Proofread the supplied text. Correct spelling, tense, grammar, and punctuation. Improve clarity and readability without changing meaning or voice. Never reprint the full text until the user approves fixes in text mode.

Read and follow [English writing style guide](../_references/Writing.md) for punctuation, voice, typography, and other prose conventions.

## Target

Accept zero or one argument:

```text
/skill:spellcheck [<file-path>]
```

**With a file path:** read that file as the proofreading target. On approved fixes, edit the file in place.

**Without a file path:** ask the user to paste the text. Do not proofread until text is provided. On approved fixes, reprint the full text with only those corrections applied.

Ignore text inside HTML comments (`<!-- ... -->`). Do not flag or rewrite fenced code blocks, inline code, URLs, file paths, or literal command output unless the error is clearly in surrounding prose.

## Checks

Apply every check below. Flag only real issues — skip sentences that need no change.

**Core**

- Spelling and typos
- Grammar, tense, and subject–verb agreement
- Punctuation and sentence structure
- Readability
- Parallel structure in lists and comparisons
- Unclear antecedents (`it`, `this`, `that`, `which`)
- Dangling or misplaced modifiers
- Redundant or wordy phrasing
- Commonly confused words (`its`/`it's`, `affect`/`effect`, `than`/`then`)
- Heading and list-item consistency (sentence case, matching fragment vs sentence style)
- Weak or vague openers (`There is`, `It is`, `In order to`) when a direct rewrite is clearer
- Misplaced only/just/simply/easily that understate difficulty
- Colon and semicolon misuse; comma splices
- Inconsistent tense within a paragraph
- Number style (spell one–ten; numerals for 11+ unless the surrounding doc already chose otherwise — then stay consistent)

**Additional checks for tech writing**

- Jargon and product-name consistency (JavaScript, TypeScript, GitHub, npm, API)
- Acronym handling — expand on first use when the audience may not know it
- Link and button text clarity (`click here`, `read more`)

**Do not flag**

- Deliberate informal tone, contractions, or stylistic fragments that match the piece
- Proper nouns, brand spellings, and domain-specific terms that are correct in context
- Markdown or HTML markup syntax unless an error affects the surrounding prose

## Process

1. Resolve the target according to **Target**. If no file path and no pasted text, ask for text and stop.
2. Read the full text once for context, audience, and register.
3. Review sentence by sentence (or list item by list item when items are standalone sentences).
4. Collect every finding, then present **all findings at once** in **Output format**. Skip sentences with no issues.
5. If there are findings, end with the choice line from **Output format**.
6. When the user replies with fix numbers (e.g. `Fix 1, 4, 7`), apply **only** those corrections:
   - **File mode:** edit the file in place. Confirm which lines changed; do not reprint the whole file.
   - **Text mode:** reprint the full supplied text with approved fixes applied. Preserve everything else byte-for-byte.
7. After applying fixes, offer to re-run proofreading on the updated text if anything substantial remains.

## Output format

Use this structure for every finding. Replace only the placeholders.

```md
1. {original sentence}

→

{corrected sentence}

_{brief explanation aimed at improving the user's understanding}_

2. {original sentence}

→

{corrected sentence}

_{explanation}_
```

Formatting rules:

- Number findings consecutively from 1 for the session.
- Quote the **exact** original sentence or list item — enough context to locate it, not the whole paragraph unless the issue spans it.
- Show the corrected version on its own line after a standalone `→`.
- Put the explanation on the next line in italics using `_..._`.
- Separate findings with a blank line.
- Do not add a summary table, preamble, or reconstructed full text during the review step.
- If there are no findings, reply exactly: `No corrections needed.`

After the last finding, add:

```text
Reply with “X, Y, Z”, “fix all”, or tell me what to do.
```

Interpret `Fix 1, 4, 7`, `1, 4, 7`, and `apply 1 and 4` as approval to apply those numbered corrections. Interpret `Fix all` as approval to apply all corrections.

## Guardrails

- Preserve meaning, facts, and the author’s voice. Do not invent examples, claims, or biographical details.
- Prefer the smallest correction that fixes the issue. Offer structural rewrites only when grammar or clarity truly requires it.
- One finding per distinct issue when possible; combine tightly related fixes in the same sentence into one entry.
- Do not edit until the user approves specific fix numbers.
- When multiple valid corrections exist, pick the best default in the corrected line and note the alternative briefly in the explanation.
