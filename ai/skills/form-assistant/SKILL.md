---
name: form-assistant
description: Assist with online forms in a visible browser.
disable-model-invocation: true
argument-hint: URL to open (optional)
---

Help the user complete large online forms in a visible browser while they retain control over login, navigation between form sections, review, and submission.

## Input

- **URL provided:** run `agent-browser open <url>` and navigate as needed to locate the form.
- **No URL:** use the current browser page.

## Safety

- Always set `AGENT_BROWSER_CONFIG="$DOTFILES_DIR/agent-browser/form-assistant.json"` before any `agent-browser` command in this workflow. Do not use a different config or profile.
- Run `agent-browser snapshot -i -c --json` before filling. Fill only fields the user explicitly approves.
- Never fill protected controls: passwords, uploads, payment, authentication, signatures, certifications, or submission buttons. Never echo password values when explaining or reporting fields.
- Do not use `eval` or `cookies` unless the user explicitly asks for a one-off exception.
- Submission is always manual: the user must perform the final submit action.
- You may navigate to locate and open the requested form. Once form completion begins, navigation between sections remains manual.

## Language

- Speak to the user in English.
- Use the page language for translatable prose and page-defined options. Preserve proper names, identifiers, addresses, and other exact values unless the user approves a translation.
- When reporting labels, options, and values, include English alongside page-language text when they differ.
- Review text: Show every text value in full before filling and again at confirmation — not a summary. Include a complete English translation for translatable text when the page language differs; show exact values unchanged. The user reviews meaning, not a paraphrase.

## Labels and field meaning

- Interactive snapshots (`snapshot -i`) list controls by accessible name. That name is often generic — bare “yes”, “no”, “option 1” — even when the real question is on the page. Do not infer the question from ref order, position, or assumption (e.g. treating every yes/no pair as marketing consent).
- When a control’s accessible name is generic or ambiguous:
  1. Re-run snapshot without `-i` (or read the full snapshot tree) and find the governing question for that ref — fieldset legend, group heading, or nearest preceding question text in the tree.
  2. If the question still is not in the tree (visible on page but not exposed to a11y), use `agent-browser read` for that section’s visible copy.
- Map each ref to its actual question before asking the user to approve values or filling anything.
- After a ref interaction changes the page, re-snapshot and re-resolve governing questions for any new or remaining controls before the next fill.

## Setup

At the start of a form-assistant session:

```bash
export AGENT_BROWSER_CONFIG="$DOTFILES_DIR/agent-browser/form-assistant.json"
```

The config enables headed mode and sets the persistent profile.

Read the [browser skill](../browser/SKILL.md) for command reference.

## Workflow

After **Setup**, follow this workflow:

1. **Open the form.** Open the URL from the skill argument, or use the current page if none (see **Input**). Navigate as needed to locate the form. The user handles login, 2FA, CAPTCHA, and section navigation (see **Safety**).
2. **Discover fields.** Run `agent-browser snapshot -i -c --json`. Resolve each control's governing question (see **Labels and field meaning**). Explain visible fields, including protected ones the agent will not fill.
3. **Collect and approve values.** Gather missing information from context, files, or the user. Present every text value in full for approval (see **Language**).
4. **Fill approved fields.** Fill only approved refs with approved values using the appropriate `agent-browser` command. After any page-changing interaction, re-snapshot and re-resolve before the next fill (see **Labels and field meaning**).
5. **Report results.** Report agent-browser outcomes accurately, including failures and stale refs.
6. **Confirm filled state.** Re-snapshot and read the actual value or state of every filled control from fresh refs. Report discrepancies. Summarize every filled control for user verification (see **Language**).
7. **Hand off.** The user reviews, corrects values manually, navigates, and submits (see **Safety**).
