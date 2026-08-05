// Shows failed pull request checks and fetches their CI logs.
//
// - Check the current pull request:
//
// `git-ci-logs`
//
// - Check a specific pull request:
//
// `git-ci-logs {{pull_request_number}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import readline from 'node:readline';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { log, run, select } from '../util/tui.ts';

const OPTIONS = [{ name: 'pullRequest', positional: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

interface Check {
  readonly name: string;
  readonly state: string;
  readonly bucket: string;
  readonly link: string;
  readonly workflow?: string;
}

const ghEnvironment = { ...process.env, GH_PAGER: 'cat' };

function fail(message: string, details?: string): never {
  log.error(message);
  if (details?.trim()) {
    console.error(details.trim());
  }
  process.exit(1);
}

function getGhOutput(args: readonly string[], errorMessage: string): string {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    env: ghEnvironment,
  });
  if (result.error !== undefined) {
    fail(errorMessage, result.error.message);
  }
  if (result.status !== 0) {
    fail(errorMessage, result.stderr);
  }
  return result.stdout;
}

function getChecks(pullRequest: string): readonly Check[] {
  const result = spawnSync(
    'gh',
    ['pr', 'checks', pullRequest, '--json', 'name,state,bucket,link,workflow'],
    { encoding: 'utf8', env: ghEnvironment }
  );

  if (result.error !== undefined) {
    fail(
      `Could not load CI checks for pull request #${pullRequest}.`,
      result.error.message
    );
  }

  // `gh pr checks` returns 1 for failed checks and 8 for pending checks while
  // still providing the requested JSON.
  if (result.status !== 0 && result.status !== 1 && result.status !== 8) {
    fail(
      `Could not load CI checks for pull request #${pullRequest}.`,
      result.stderr
    );
  }

  return JSON.parse(result.stdout) as readonly Check[];
}

function getRunId(link: string): string | undefined {
  return link.match(/\/actions\/runs\/(\d+)/)?.[1];
}

interface Job {
  readonly databaseId: number;
  readonly name: string;
  readonly url: string;
}

interface RunDetails {
  readonly jobs: readonly Job[];
  readonly workflowName: string;
  readonly url: string;
}

interface LogResult {
  readonly error?: Error;
  readonly lineCount: number;
  readonly status: number | null;
  readonly stderr: string;
}

function formatLogLine(line: string): string {
  const timestamp = line.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/
  );
  const message =
    timestamp?.index === undefined
      ? line
      : line.slice(timestamp.index + timestamp[0].length).replace(/^[\t ]/, '');

  // Decode colors only; leave all other terminal control sequences inert.
  return message.replaceAll(/\^\[\[([\d;]*)m/g, '\u001B[$1m');
}

async function streamGhLogs(args: readonly string[]): Promise<LogResult> {
  const child = spawn('gh', args, {
    env: ghEnvironment,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  let commandError: Error | undefined;
  let stderr = '';
  child.on('error', (error) => {
    commandError = error;
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const closed = once(child, 'close');
  const lines = readline.createInterface({
    input: child.stdout,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  let lineCount = 0;
  for await (const line of lines) {
    console.log(formatLogLine(line));
    lineCount += 1;
  }

  let status: number | null;
  try {
    [status] = (await closed) as [number | null];
  } catch {
    status = null;
  }
  return { error: commandError, lineCount, status, stderr };
}

async function showJobLogs(runId: string, job: Job): Promise<void> {
  log.heading(`\n${job.name}`);
  console.log(job.url);
  console.log();

  const jobArgs = ['run', 'view', runId, '--job', String(job.databaseId)];
  const failedLogs = await streamGhLogs([...jobArgs, '--log-failed']);
  if (failedLogs.error !== undefined) {
    fail(`Could not load logs for job ${job.name}.`, failedLogs.error.message);
  }
  if (failedLogs.status === 0 && failedLogs.lineCount > 0) {
    return;
  }

  const fullLogs = await streamGhLogs([...jobArgs, '--log']);
  if (fullLogs.error !== undefined) {
    fail(`Could not load logs for job ${job.name}.`, fullLogs.error.message);
  }
  if (fullLogs.status !== 0) {
    fail(`Could not load logs for job ${job.name}.`, fullLogs.stderr);
  }
}

function getRunDetails(runId: string): RunDetails {
  return JSON.parse(
    getGhOutput(
      [
        'run',
        'view',
        runId,
        '--json',
        'workflowName,url,jobs',
        '--jq',
        '{workflowName,url,jobs: [.jobs[] | select(.conclusion == "failure") | {databaseId,name,url}]}',
      ],
      `Could not load GitHub Actions run ${runId}.`
    )
  ) as RunDetails;
}

function showRunHeader(details: RunDetails): void {
  const separatorWidth = process.stdout.isTTY ? process.stdout.columns : 80;
  console.log(`\n\n${'─'.repeat(separatorWidth)}`);
  log.heading(details.workflowName);
  console.log(details.url);
}

export async function gitCiLogs({
  pullRequest: pullRequestArgument,
}: Options): Promise<void> {
  if (
    pullRequestArgument !== undefined &&
    /^[1-9]\d*$/.test(pullRequestArgument) === false
  ) {
    fail(
      `Pull request number must be a positive integer: ${pullRequestArgument}`
    );
  }

  const pullRequest =
    pullRequestArgument ??
    getGhOutput(
      ['pr', 'view', '--json', 'number', '--jq', '.number'],
      'Could not find a pull request for the current branch.'
    ).trim();

  const details = getGhOutput(
    [
      'pr',
      'view',
      pullRequest,
      '--json',
      'number,url,headRefName,baseRefName',
      '--jq',
      '"PR #\\(.number): \\(.headRefName) → \\(.baseRefName)\\n\\(.url)"',
    ],
    `Could not load pull request #${pullRequest}. Verify that it exists in the current repository.`
  ).trim();
  console.log(`${details}\n`);

  const failures = getChecks(pullRequest).filter(
    (check) => check.bucket === 'fail'
  );
  if (failures.length === 0) {
    console.log('No failed CI checks found.');
    return;
  }

  const runIds = new Set<string>();
  for (const check of failures) {
    const runId = getRunId(check.link);
    if (runId === undefined) {
      console.log(
        `\nExternal check (logs unavailable): ${check.name}\n${check.link}`
      );
    } else {
      runIds.add(runId);
    }
  }

  const runs = [...runIds].map((runId) => ({
    details: getRunDetails(runId),
    runId,
  }));
  const isInteractive =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  if (isInteractive) {
    const jobs = new Map<
      string,
      {
        readonly details: RunDetails;
        readonly job: Job;
        readonly runId: string;
      }
    >();
    for (const workflowRun of runs) {
      for (const job of workflowRun.details.jobs) {
        jobs.set(`${workflowRun.details.workflowName} / ${job.name}`, {
          ...workflowRun,
          job,
        });
      }
    }

    const selectedLabel = select([...jobs.keys()], 'Select a failed job:');
    if (selectedLabel === undefined) {
      return;
    }

    const selectedJob = jobs.get(selectedLabel);
    if (selectedJob === undefined) {
      return;
    }

    showRunHeader(selectedJob.details);
    await showJobLogs(selectedJob.runId, selectedJob.job);
  } else {
    for (const workflowRun of runs) {
      showRunHeader(workflowRun.details);
      for (const job of workflowRun.details.jobs) {
        await showJobLogs(workflowRun.runId, job);
      }
    }
  }
}

await run(import.meta.url, () => gitCiLogs(parseArgs(OPTIONS)));
