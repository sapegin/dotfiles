---
name: web-search
description: Search the web using DuckDuckGo via the ddgr CLI tool. Use when the user asks to search the web, look something up online, find information on the internet, get instant answers, or needs current/real-time data.
---

Search DuckDuckGo from the terminal using [ddgr](https://github.com/jarun/ddgr).

## When to use

- User asks to search the web or look something up
- Need current/real-time information not in training data
- User wants to find documentation, tutorials, or resources

## Basic usage

```bash
ddgr --noua --json "search query"
```

Required flags:

```
--noua   Disable user agent (always use this)
--json   Output in JSON format for parsing (implies no interactive prompt)
```

## Options

```
--num N       Show N (0<=N<=25) results per page (default 10)
--time SPAN   Time limit search [d (1 day), w (1 wk), m (1 month), y (1 year)]
--instant     Retrieve only an instant answer
--site SITE   Search sites using DuckDuckGo
--reg REG     Region-specific search e.g. 'us-en' for US (default)
```

## Examples

Basic search:

```bash
ddgr --noua --json "python asyncio tutorial"
```

Limit to 5 results:

```bash
ddgr --noua --json -num 5 "quick query"
```

Recent results (last week):

```bash
ddgr --noua --json --time w "latest news topic"
```

Instant answer:

```bash
ddgr --noua --json --instant "weather new york"
```

Site-specific search:

```bash
ddgr --noua --json --site stackoverflow.com "parse JSON"
```

Region-specific (India, English):

```bash
ddgr --noua --json --reg in-en "IPL cricket"
```
