import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
} from '@raycast/api';
import { useMemo, useState } from 'react';
import { searchProjects, tildify } from '../../../src/util/projects.ts';

const execFile = promisify(execFileCallback);

// All actions dismiss Tinycast without awaiting `closeMainWindow()` so the
// window animates out while the action runs; awaiting would serialize the close
// before slow work, and closing after the action would leave the list visible
// for the whole operation making the action feel slower.

export default function OpenProject() {
  const [searchText, setSearchText] = useState('');

  const projects = useMemo(() => searchProjects(searchText), [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search projects…"
    >
      {projects.map((folderPath) => (
        <List.Item
          key={folderPath}
          title={path.basename(folderPath)}
          subtitle={tildify(path.dirname(folderPath))}
          icon={{ fileIcon: folderPath }}
          actions={
            <ActionPanel>
              <Action
                title="Open in Visual Studio Code"
                onAction={() => openProject(folderPath)}
              />
              <Action
                title="Show in Finder"
                icon={Icon.Finder}
                onAction={() => revealInFinder(folderPath)}
              />
              <Action
                title="Copy path"
                icon={Icon.Clipboard}
                onAction={() => copyProjectPath(folderPath)}
              />
              <Action
                title="Open in Ghostty"
                icon={Icon.Terminal}
                onAction={() => openInGhostty(folderPath)}
              />
              <Action
                title="Open on GitHub"
                icon={Icon.Link}
                onAction={() => openOnGitHub(folderPath)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function revealInFinder(folderPath: string): Promise<void> {
  void closeMainWindow();
  try {
    await showInFinder(folderPath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not show in Finder',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function copyProjectPath(folderPath: string): Promise<void> {
  void closeMainWindow();
  try {
    await Clipboard.copy(folderPath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not copy path',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInGhostty(folderPath: string): Promise<void> {
  void closeMainWindow();
  try {
    await execFile(
      'open',
      ['-na', 'ghostty.app', '--args', `--working-directory=${folderPath}`],
      { env: process.env }
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not open Ghostty',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openOnGitHub(folderPath: string): Promise<void> {
  void closeMainWindow();

  const url = await gitHubWebUrl(folderPath);
  if (url === undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'No GitHub remote',
      message: 'Could not find an origin URL for this folder.',
    });
    return;
  }

  try {
    await open(url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not open GitHub',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function gitHubWebUrl(folderPath: string): Promise<string | undefined> {
  let remote: string;
  try {
    const { stdout } = await execFile(
      'git',
      ['-C', folderPath, 'remote', 'get-url', 'origin'],
      { env: process.env }
    );
    remote = stdout.trim();
  } catch {
    return undefined;
  }

  if (remote.length === 0) {
    return undefined;
  }

  if (remote.startsWith('https://github.com/')) {
    return remote.replace(/\.git$/, '');
  }

  const colonMatch = /^git@github\.com:(.+)$/.exec(remote);
  if (colonMatch !== null) {
    const repoPath = colonMatch[1].replace(/\.git$/, '');
    return `https://github.com/${repoPath}`;
  }

  const sshMatch = /^ssh:\/\/git@github\.com\/(.+)$/.exec(remote);
  if (sshMatch !== null) {
    const repoPath = sshMatch[1].replace(/\.git$/, '');
    return `https://github.com/${repoPath}`;
  }

  return undefined;
}

async function openProject(folderPath: string): Promise<void> {
  void closeMainWindow();

  // Tinycast’s `open()` sends folders to Finder, so we open `code` directly.
  try {
    await execFile('code', [folderPath], { env: process.env });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not open Visual Studio Code',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
