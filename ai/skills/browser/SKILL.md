---
name: browser
description: Interact with web pages using agent-browser — navigate, click, fill, extract text, screenshot, log in, and test web apps. Use when the user asks to browse a site, automate browser actions, check a page in browser, scrape rendered content, or verify UI behavior.
---

Use `agent-browser` for browser automation. Prefer it over `curl`, `web_fetch`, or guessing DOM structure when the task needs a real page, JavaScript, login state, or interaction.

## Reference

Load the version-synced bundled skill before running commands:

```bash
agent-browser skills get core
```

Follow its snapshot-and-ref workflow: open, `snapshot -i`, act on `@eN` refs, re-snapshot after page changes.
