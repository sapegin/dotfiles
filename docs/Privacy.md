# Privacy

Opt out of telemetry and avoidable network chatter in tools from this machine. Shell env lives in [`zsh/env.zsh`](../zsh/env.zsh). App configs that sync from this repo are listed under **Synced**. Everything else is a one-shot command or a GUI toggle — run or flip once per Mac.

## Synced

| Tool | Where | What |
| --- | --- | --- |
| Homebrew | `zsh/env.zsh` | `HOMEBREW_NO_ANALYTICS=1` |
| Generic / DO_NOT_TRACK | `zsh/env.zsh` | `DISABLE_TELEMETRY=1`, `DO_NOT_TRACK=1` |
| GitHub CLI | `zsh/env.zsh` | `GH_TELEMETRY=false` (overrides config) |
| mise | `zsh/env.zsh` | `MISE_USE_VERSIONS_HOST_TRACK=0` |
| npm | `zsh/env.zsh` | `NPM_CONFIG_FUND=false`, `NPM_CONFIG_UPDATE_NOTIFIER=false` |
| Visual Studio Code | `vscode/User/settings.json` | `telemetry.telemetryLevel: off`, experiments off |
| Firefox | `firefox/user.js` | Telemetry, Normandy/Shield, crash reports, recommendations |
| Pi | `pi/agent/settings.json` | `enableInstallTelemetry: false` |
| macOS CrashReporter | `bin/macos-defaults` | Dialog type `none` |

## One-shot commands

Run after setup (or on a new Mac). Env vars above already cover these for interactive shells; the config commands stick for tools launched outside zsh.

```sh
# GitHub CLI usage telemetry (also covered by GH_TELEMETRY / DO_NOT_TRACK)
gh config set telemetry disabled

# Optional: stop gh update-check nags (network on each run)
# export GH_NO_UPDATE_NOTIFIER=1
# export GH_NO_EXTENSION_UPDATE_NOTIFIER=1
```

Confirm:

```sh
gh config get telemetry
# → disabled
brew analytics state
# → InfluxDB analytics are disabled / Google Analytics were destroyed
```

## GUI settings

Check these after setup or a major OS/app upgrade.

### macOS

**System Settings → Privacy & Security → Analytics & Improvements**

- Turn off **Share Mac Analytics**
- Turn off **Share with app developers**
- Turn off **Share iCloud Analytics** (if shown)
- Turn off **Improve Siri & Dictation** (if shown)
- Turn off **Improve Assistive Voice Features** (if shown)

### Cursor

**Cursor Settings → General** (`Cmd+Shift+J`)

- Turn on **Privacy Mode** (no training / ZDR with providers; agent traffic still goes through Cursor)

Optional in Cursor `settings.json` (not synced from this repo’s VS Code tree):

```json
"telemetry.telemetryLevel": "off",
"crashReporting.enabled": false
```

### Visual Studio Code

Telemetry is already off via synced settings. Confirm under **Settings → search “telemetry”** → **Telemetry Level: off**.

### GitHub Desktop

**GitHub Desktop → Settings → Advanced**

- Enable **Opt out of usage tracking** (wording may be “Help GitHub Desktop improve…” unchecked)

Crash/error reports and auto-updates cannot be disabled in-app.

### Obsidian

Obsidian does not collect product telemetry. Sync is already off in vault core plugins.

**Settings → General**

- Turn off **Automatic updates** if you prefer manual updates only

Community plugins can still make their own network calls; prefer ones you trust.

### Firefox

Most telemetry prefs are in synced `firefox/user.js`. After profile sync, confirm in **Settings → Privacy & Security** that Firefox Data Collection and Use options stay off.

### Chrome

No policy file in this repo. For a throwaway profile: **Settings → Privacy and security → Ads privacy / Chrome’s privacy guidance** — decline optional sharing. Prefer Firefox for daily browsing.

### Other Brewfile GUI apps

Notion, Telegram, WhatsApp, Adobe Creative Cloud, and similar apps have their own account-level privacy toggles. There is no durable dotfiles hook; review each app’s settings after install or major updates.
