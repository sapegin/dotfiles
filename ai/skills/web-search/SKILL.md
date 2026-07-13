---
name: web-search
description: Search the web using DuckDuckGo. Use when the user asks to search online, look something up, find current information, or locate documentation, and resources.
---

Search DuckDuckGo from the terminal with `ddgr`.

## Usage

Always use JSON output and disable the user agent:

```bash
ddgr --noua --json "search query"
```

Examples:

```bash
# Return up to 5 results
ddgr --noua --json --num 5 "python asyncio tutorial"

# Search only documents no older than one week
ddgr --noua --json --time w "latest news topic"

# Search within one site
ddgr --noua --json --site stackoverflow.com "parse JSON"
```
