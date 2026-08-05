---
name: browser
description: Interact with websites using agent-browser — navigate, click, fill, extract text, screenshot, log in, and test web apps. Use when the user asks to browse a site, automate browser actions, check a page in browser, scrape rendered content, or verify UI behavior.
metadata:
  tested-with: agent-browser 0.33.1
---

Use `agent-browser` for browser automation. Prefer it over `curl`, `web_fetch`, or guessing DOM structure when the task needs a real page, JavaScript, login state, or interaction.

## Core loop

```bash
agent-browser open <url>        # 1. Open a page
agent-browser snapshot -i       # 2. See interactive elements
agent-browser click @e3         # 3. Act on refs from the snapshot
agent-browser snapshot -i       # 4. Re-snapshot after any page change
```

Refs (`@e1`, `@e2`, …) are assigned fresh on every snapshot. They become stale after navigation, submits, re-renders, or dialogs. Always re-snapshot before the next ref interaction.

## Reading a page

```bash
agent-browser snapshot -i                 # interactive elements (preferred)
agent-browser snapshot -i -c              # compact tree
agent-browser snapshot -i -u              # include link URLs
agent-browser snapshot -i --json          # machine-readable output
agent-browser snapshot -s "#main" -i      # scope to a selector
agent-browser get text @e1                # visible text
agent-browser get value @e1               # input value
agent-browser get attr @e1 href           # attribute
agent-browser get title                   # page title
agent-browser get url                     # current URL
agent-browser read                        # read rendered active-tab DOM
```

## Interacting

```bash
agent-browser click @e1
agent-browser fill @e2 "hello"            # clear then type
agent-browser type @e2 " world"            # append without clearing
agent-browser press Enter
agent-browser check @e3                   # checkbox
agent-browser select @e4 "option-value"   # dropdown
agent-browser upload @e5 file.pdf
agent-browser scroll down 500
agent-browser scrollintoview @e1
agent-browser hover @e1
```

When refs fail, use semantic locators:

```bash
agent-browser find role button click --name "Submit"
agent-browser find label "Email" fill "user@test.com"
agent-browser find placeholder "Search" fill "query"
agent-browser click "#submit"             # CSS fallback
```

Prefer snapshot refs first, then `find`, then CSS.

## Waiting

```bash
agent-browser wait @e1                     # until element appears
agent-browser wait --text "Success"        # until text appears
agent-browser wait --url "**/dashboard"    # until URL matches
agent-browser wait --load networkidle      # after navigation / SPA updates
```

Avoid bare `wait 2000` except when debugging.

## Tabs and sessions

```bash
agent-browser tab                          # list tabs
agent-browser tab new https://example.com
agent-browser tab t2                       # switch tab
agent-browser tab close t2
```

Each `--session <name>` is an isolated browser. Derive stable ids when needed:

```bash
SESSION="$(agent-browser session id --scope worktree --prefix my-app)"
agent-browser --session "$SESSION" --restore open https://app.example.com
```

## Screenshots and cleanup

```bash
agent-browser screenshot page.png
agent-browser screenshot --full full.png
agent-browser close
```

## Sensitive flows

For credentials, prefer the auth vault over shell history:

```bash
agent-browser auth save my-app --url https://app.example.com/login \
  --username user@example.com --password-stdin
agent-browser auth login my-app
```

For restricted domains, use `--allowed-domains` on supported Chromium sessions.
