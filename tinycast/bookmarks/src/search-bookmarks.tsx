import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import {
  BOOKMARKS_FILE,
  filterBookmarks,
  loadBookmarks,
  type Bookmark,
} from '../../../src/util/bookmarks.ts';

const execFile = promisify(execFileCallback);

/** Open a path in Visual Studio Code; optional 1-based line for `-g`. */
async function openInVSCode(
  filePath: string,
  lineNumber?: number
): Promise<void> {
  const args =
    lineNumber === undefined ? [filePath] : ['-g', `${filePath}:${lineNumber}`];

  try {
    await execFile('code', args, { env: process.env });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not open Visual Studio Code',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState('');

  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setAllBookmarks(loadBookmarks());
  }, []);

  const bookmarks = useMemo(
    () => filterBookmarks(searchText, allBookmarks),
    [searchText, allBookmarks]
  );

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search bookmarks…"
    >
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.titleLineNumber}
          title={bookmark.title}
          subtitle={bookmark.subtitle}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Open in browser"
                onAction={() => openBookmark(bookmark)}
              />
              <Action
                title="Copy URL"
                icon={Icon.Clipboard}
                onAction={() => Clipboard.copy(bookmark.url)}
              />
              <Action
                title="Edit bookmark in Visual Studio Code"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ['opt'], key: 'return' }}
                onAction={() => editBookmarkLine(bookmark)}
              />
              <Action
                title="Edit bookmarks file"
                icon={Icon.Document}
                onAction={() => editBookmarksFile()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function openBookmark(bookmark: Bookmark): Promise<void> {
  await closeMainWindow();
  try {
    await open(bookmark.url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not open link',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function editBookmarkLine(bookmark: Bookmark): Promise<void> {
  await closeMainWindow();
  await openInVSCode(BOOKMARKS_FILE, bookmark.titleLineNumber);
}

async function editBookmarksFile(): Promise<void> {
  await closeMainWindow();
  await openInVSCode(BOOKMARKS_FILE);
}
