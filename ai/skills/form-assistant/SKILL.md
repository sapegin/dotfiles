---
name: form-assistant
description: Assist with online forms in a visible browser.
disable-model-invocation: true
---

Help the user complete large online forms in a visible browser while they retain control over login, navigation, review, and submission.

## Safety

- Always set `AGENT_BROWSER_CONFIG="$DOTFILES_DIR/agent-browser/form-assistant.json"` before any `agent-browser` command in this workflow. Do not use a different config or profile.
- Run `agent-browser snapshot -i -c --json` before filling. Fill only fields the user explicitly approves.
- Never fill protected controls: passwords, uploads, payment, authentication, signatures, certifications, or submission buttons.
- Do not use `click`, `upload`, `eval`, `cookies`, or navigation commands unless the user explicitly asks for a one-off exception.
- Never submit a form.
- Navigation between sections remains manual.

## Language

- Speak to the user in English.
- Fill values in the page language, not an English equivalent.
- When reporting labels, options, and values, include English alongside page-language text when they differ.

## Config

At the start of a form-assistant session:

```bash
export AGENT_BROWSER_CONFIG="$DOTFILES_DIR/agent-browser/form-assistant.json"
```

The config enables headed mode and sets the persistent profile.

## agent-browser reference

For command syntax, snapshot/ref mechanics, and troubleshooting, load the version-synced bundled skill instead of guessing:

```bash
agent-browser skills get core
```

## Workflow

1. Ask whether the user wants to open a URL or use the current browser page.
2. Run `agent-browser open` when needed. The user logs in, completes 2FA or CAPTCHA, and navigates manually.
3. Run `agent-browser snapshot -i -c --json`, explain visible fields including protected ones, and never echo password values.
4. Collect missing information available context, files or ask the user in English.
5. Fill only approved refs with page-language values using the appropriate `agent-browser` command for the control type.
6. Report agent-browser results accurately, including failures and stale refs after page changes.
7. Let the user review, correct values manually, navigate, and submit.
