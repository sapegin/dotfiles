import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'git-ci-logs.ts');
let tempDirectory: string;
let callsPath: string;
let ttyPath: string;

function gitCiLogs(
  pullRequest?: string,
  additionalEnvironment: NodeJS.ProcessEnv = {}
): string {
  return execFileSync(
    process.execPath,
    [scriptPath, ...(pullRequest === undefined ? [] : [pullRequest])],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDirectory}:${process.env.PATH}`,
        GH_CALLS: callsPath,
        ...additionalEnvironment,
      },
    }
  );
}

beforeAll(() => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'git-ci-logs-'));
  callsPath = path.join(tempDirectory, 'calls');
  const ghPath = path.join(tempDirectory, 'gh');
  fs.writeFileSync(
    ghPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALLS"
if [[ $GH_PAGER != cat ]]; then
  printf 'GH_PAGER must be disabled\\n' >&2
  exit 98
elif [[ $1 == pr && $2 == view && $3 == --json ]]; then
  printf '42\\n'
elif [[ $1 == pr && $2 == view && $3 == 5901 ]]; then
  printf 'GraphQL: Could not resolve to a PullRequest with the number of 5901. (repository.pullRequest)\\n' >&2
  exit 1
elif [[ $1 == pr && $2 == view ]]; then
  printf 'PR #%s: feature -> main\\nhttps://github.com/acme/repo/pull/%s\\n' "$3" "$3"
elif [[ $1 == pr && $2 == checks ]]; then
  printf '[{"name":"tests","state":"FAILURE","bucket":"fail","workflow":"CI","link":"https://github.com/acme/repo/actions/runs/100/job/1"},{"name":"vendor","state":"FAILURE","bucket":"fail","link":"https://ci.example.test/check/2"},{"name":"cancelled-check","state":"CANCELLED","bucket":"cancel","workflow":"CI","link":"https://github.com/acme/repo/actions/runs/200/job/3"}]\\n'
  exit 1
elif [[ $1 == run && $2 == view && $4 == --json ]]; then
  printf '{"workflowName":"CI","url":"https://github.com/acme/repo/actions/runs/100","jobs":[{"databaseId":1,"name":"tests","url":"https://github.com/acme/repo/actions/runs/100/job/1"},{"databaseId":2,"name":"lint","url":"https://github.com/acme/repo/actions/runs/100/job/2"}]}\\n'
elif [[ $1 == run && $2 == view && $4 == --job && $5 == 2 && $6 == --log-failed ]]; then
  printf 'lint     Run lint    2026-07-28T13:02:00.0000000Z lint failed\\n'
elif [[ $1 == run && $2 == view && $4 == --job && $6 == --log-failed ]]; then
  exit 1
elif [[ $1 == run && $2 == view && $4 == --job && $6 == --log && $5 == 1 ]]; then
  printf "Validate pull request title     UNKNOWN STEP    2026-07-28T13:01:14.0992566Z Current runner version: '2.336.0'\\n"
  printf 'Validate pull request title     UNKNOWN STEP    2026-07-28T13:01:14.0995000Z\\n'
  printf "Validate pull request title     UNKNOWN STEP    2026-07-28T13:01:14.0999040Z Runner name: 'umg-ubuntu-latest-z479t-runner-jpgcc'\\n"
  printf "Validate pull request title     UNKNOWN STEP    2026-07-28T13:01:14.1000034Z Runner group name: 'aws44-devops-eks-prod-v4'\\n"
  printf 'Validate pull request title     Run build    2026-07-28T13:01:15.0000000Z ^[[36;1mvercel build^[[0m\\n'
else
  printf 'unexpected gh invocation: %s\\n' "$*" >&2
  exit 99
fi
`
  );
  fs.chmodSync(ghPath, 0o755);

  const fzfPath = path.join(tempDirectory, 'fzf');
  fs.writeFileSync(fzfPath, "#!/usr/bin/env bash\ngrep '^CI / lint'\n");
  fs.chmodSync(fzfPath, 0o755);

  ttyPath = path.join(tempDirectory, 'tty.mjs');
  fs.writeFileSync(
    ttyPath,
    "Object.defineProperty(process.stdin, 'isTTY', { value: true });\nObject.defineProperty(process.stdout, 'isTTY', { value: true });\nObject.defineProperty(process.stdout, 'columns', { value: 80 });\n"
  );
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('git-ci-logs', () => {
  test('checks a specific pull request and fetches linked run logs', () => {
    const output = gitCiLogs('17');

    expect(output).toContain('PR #17');
    expect(output).toContain('─'.repeat(80));
    expect(output).toContain('CI');
    expect(output).toContain('https://github.com/acme/repo/actions/runs/100');
    expect(output).toContain('tests');
    expect(output).toContain(
      'https://github.com/acme/repo/actions/runs/100/job/1'
    );
    expect(output).toContain('lint');
    expect(output).toContain(
      'https://github.com/acme/repo/actions/runs/100/job/2'
    );
    expect(output).toContain('lint failed');
    expect(output).not.toContain('GitHub Actions run 100');
    expect(output).toContain(
      "Current runner version: '2.336.0'\n\nRunner name: 'umg-ubuntu-latest-z479t-runner-jpgcc'"
    );
    expect(output).toContain("Runner group name: 'aws44-devops-eks-prod-v4'");
    expect(output).toContain('\u001B[36;1mvercel build\u001B[0m');
    expect(output).not.toContain('^[[36;1m');
    expect(output).not.toContain('UNKNOWN STEP');
    expect(output).not.toContain('2026-07-28');
    expect(output).toContain('External check (logs unavailable): vendor');
    expect(output).not.toContain('/ vendor');
    expect(output).not.toContain('cancelled-check');
    const calls = fs.readFileSync(callsPath, 'utf8');
    expect(calls).toContain(
      'run view 100 --json workflowName,url,jobs --jq {workflowName,url,jobs: [.jobs[] | select(.conclusion == "failure") | {databaseId,name,url}]}'
    );
    expect(calls).toContain('run view 100 --job 1 --log-failed');
    expect(calls).toContain('run view 100 --job 1 --log');
    expect(calls).toContain('run view 100 --job 2 --log-failed');
    expect(calls.split('\n')).not.toContain('run view 100 --job 2 --log');
    expect(calls).not.toContain('pr view --json number');
  });

  test('fetches every failed job in a non-interactive terminal', () => {
    fs.writeFileSync(callsPath, '');

    gitCiLogs('17');

    const calls = fs.readFileSync(callsPath, 'utf8');
    expect(calls).toContain('run view 100 --job 1 --log-failed');
    expect(calls).toContain('run view 100 --job 2 --log-failed');
  });

  test('fetches only the interactively selected failed job', () => {
    fs.writeFileSync(callsPath, '');

    gitCiLogs('17', { NODE_OPTIONS: `--import=${ttyPath}` });

    const calls = fs.readFileSync(callsPath, 'utf8');
    expect(calls).not.toContain('run view 100 --job 1');
    expect(calls).toContain('run view 100 --job 2 --log-failed');
  });

  test('uses the pull request for the current branch by default', () => {
    fs.writeFileSync(callsPath, '');

    expect(gitCiLogs()).toContain('PR #42');
    expect(fs.readFileSync(callsPath, 'utf8')).toContain(
      'pr view --json number --jq .number'
    );
  });

  test('reports a missing pull request without a stack trace', () => {
    const result = spawnSync(process.execPath, [scriptPath, '5901'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDirectory}:${process.env.PATH}`,
        GH_CALLS: callsPath,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Could not load pull request #5901. Verify that it exists in the current repository.'
    );
    expect(result.stderr).toContain(
      'GraphQL: Could not resolve to a PullRequest with the number of 5901.'
    );
    expect(result.stderr).not.toContain('at main');
    expect(result.stderr).not.toContain('Command failed:');
  });
});
