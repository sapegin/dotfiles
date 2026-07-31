---
name: dependabot
description: Read, summarize, triage, and fix GitHub Dependabot alerts.
disable-model-invocation: true
---

# Dependabot

Read [the GitHub skill](../github/SKILL.md) before using GitHub.

## Read alerts

Always begin by reading and summarizing all open Dependabot alerts for the current repository. Do not merely announce that the skill is loaded or ask what to inspect. Show the alert count, severity counts, and a concise list with each alert's package, severity, manifest, vulnerable range, first patched version, and URL. Then ask what the user wants to remediate. If the repository cannot be determined, GitHub authentication fails, or access is denied, report that error instead.

Use the read-only REST endpoint and always paginate:

```bash
gh api --paginate \
  "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100" \
  --jq '.[] | {
    number,
    package: .dependency.package.name,
    ecosystem: .dependency.package.ecosystem,
    manifest: .dependency.manifest_path,
    relationship: .dependency.relationship,
    scope: .dependency.scope,
    advisory: .security_advisory.ghsa_id,
    severity: .security_advisory.severity,
    summary: .security_advisory.summary,
    vulnerable_range: .security_vulnerability.vulnerable_version_range,
    patched_version: .security_vulnerability.first_patched_version.identifier,
    url: .html_url
  }'
```

Inspect one alert in full when its metadata or remediation is unclear:

```bash
gh api "repos/{owner}/{repo}/dependabot/alerts/$alert_number"
```

Do not infer that a version is safe solely because its major number is larger. Check `vulnerable_version_range` and `first_patched_version`; advisories may have separate patched releases for several major lines. If `first_patched_version` is null, report that no patch is available and do not make a speculative dependency change.

## Triage

Group duplicate alerts by package, advisory, and manifest. Prioritize:

1. Critical and high severity.
2. Direct runtime dependencies.
3. Reachable transitive runtime dependencies.
4. Build and development dependencies.

Severity alone does not establish exploitability. State what the alert proves and what remains unknown from repository context.

For each package being investigated:

1. Identify every installed version and dependency path using the repository’s package manager.
2. Inspect dependency manifests and any lockfiles.
3. Check the immediate parent’s declared dependency range and available releases.
4. Choose the smallest durable remediation in this order:
   - Upgrade a direct dependency.
   - Refresh a stale transitive lock resolution when the existing parent range admits a patched release.
   - Upgrade the immediate owning parent to the earliest compatible release whose dependency range is safe.
   - Use an override only when no parent-level fix exists and compatibility has been verified; explain that trade-off first.
5. Never force a transitive package across incompatible major versions merely to exceed a scanner’s displayed version. Prefer a patched backport when the advisory marks it safe.

## Apply and verify fixes

Follow the repository’s package-manager instructions and preserve unrelated working-tree changes. Regenerate existing lockfiles with the package manager where practical; avoid broad dependency refreshes when a targeted resolution is sufficient.

Verify observable behavior:

- Run a frozen or immutable install when the package manager supports it.
- Re-run the dependency-tree query and confirm no vulnerable resolution remains.
- Run the closest build, generation, lint, type-check, or test command that exercises the owning dependency.
- Run the package-manager audit when available and filter its structured output by exact package name.
- Check the final diff for unrelated lockfile churn.

A local fix does not immediately close a Dependabot alert. GitHub closes it only after the fix is committed, pushed, and rescanned. Do not claim that an alert is closed based only on local validation.

## Output

Report concisely:

- Number of alerts inspected.
- Counts by severity when summarizing multiple alerts.
- Package, vulnerable path, affected range, and first patched version.
- Remediation used and its trade-offs.
- Files changed and validation results.
- Remaining alerts, unavailable metadata, permission failures, or required GitHub rescan.
