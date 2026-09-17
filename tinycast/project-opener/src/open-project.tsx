import { execFile as execFileCallback } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  Action,
  ActionPanel,
  closeMainWindow,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { useMemo, useState } from 'react';
import { searchProjects } from '../../../src/util/projects.ts';

const execFile = promisify(execFileCallback);

const HOME = os.homedir();

function tildify(filepath: string): string {
  return filepath.replace(HOME, '~');
}

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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function openProject(folderPath: string): Promise<void> {
  // Close Tinycast window before opening VS Code to make it feel faster.
  await closeMainWindow();

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
