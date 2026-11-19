// Collect all open Dependabot alerts, severity counts, and duplicate groups.
//
// `dependabot-context`

import { parseArgs } from '../util/args.ts';
import { captureCommand } from '../util/process.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [] as const;

interface DependabotAlert {
  number: number;
  dependency: {
    package: { name: string; ecosystem: string };
    manifest_path: string;
    relationship: string;
    scope: string;
  };
  security_advisory: { ghsa_id: string; severity: string; summary: string };
  security_vulnerability: {
    vulnerable_version_range: string;
    first_patched_version: { identifier: string } | null;
  };
  html_url: string;
}

/**
 * Fetch every page before reporting totals; API failures never mean zero
 * alerts.
 */
export function dependabotContext(): void {
  const env = { ...process.env, GH_PAGER: 'cat' };
  const repository = captureCommand(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
    { env }
  ).stdout.trim();
  const pages = JSON.parse(
    captureCommand(
      'gh',
      [
        'api',
        '--paginate',
        '--slurp',
        `repos/${repository}/dependabot/alerts?state=open&per_page=100`,
      ],
      { env }
    ).stdout
  ) as DependabotAlert[][];
  const alerts = pages.flat().map((alert) => ({
    number: alert.number,
    package: alert.dependency.package.name,
    ecosystem: alert.dependency.package.ecosystem,
    manifest: alert.dependency.manifest_path,
    relationship: alert.dependency.relationship,
    scope: alert.dependency.scope,
    advisory: alert.security_advisory.ghsa_id,
    severity: alert.security_advisory.severity,
    summary: alert.security_advisory.summary,
    vulnerable_range: alert.security_vulnerability.vulnerable_version_range,
    patched_version:
      alert.security_vulnerability.first_patched_version?.identifier ?? null,
    url: alert.html_url,
  }));
  const severities: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const groups = new Map<
    string,
    {
      package: string;
      advisory: string;
      manifest: string;
      alert_numbers: number[];
    }
  >();
  for (const alert of alerts) {
    severities[alert.severity] = (severities[alert.severity] ?? 0) + 1;
    const key = JSON.stringify([alert.package, alert.advisory, alert.manifest]);
    const group = groups.get(key) ?? {
      package: alert.package,
      advisory: alert.advisory,
      manifest: alert.manifest,
      alert_numbers: [],
    };
    group.alert_numbers.push(alert.number);
    groups.set(key, group);
  }
  console.log(
    JSON.stringify(
      {
        repository,
        count: alerts.length,
        severities,
        groups: [...groups.values()],
        alerts,
      },
      null,
      2
    )
  );
}

await run(import.meta.url, () => {
  parseArgs(OPTIONS);
  dependabotContext();
});
