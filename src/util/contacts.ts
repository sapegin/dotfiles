/**
 * Apple Contacts helpers for resolving Hotdog-style invitee aliases.
 *
 * Config entries are plain emails or `ContactName:label` (e.g. `Possum:home`).
 * Names match display name, nickname, or a unique name token. Labels match
 * short keys (`home` / `work` / …), CN wrappers (`_$!<Home>!$_`), or the
 * Contacts label text.
 */
import { execFileSync } from 'node:child_process';

export interface ContactLabeledEmail {
  /** Raw label from Contacts (CN key or custom text). */
  readonly label: string;
  readonly value: string;
}

export interface ContactRecord {
  readonly displayName: string;
  /** Display name plus nickname — used for exact and token matching. */
  readonly searchableName: string;
  readonly emails: readonly ContactLabeledEmail[];
}

export interface ResolvedDefaultInvitees {
  readonly emails: readonly string[];
  /** Raw config entries that could not be resolved. */
  readonly unresolved: readonly string[];
}

const CN_LABEL_WRAPPER = /^_\$!<(?<key>[^>]+)>!\$_$/u;

/** Resolve invitee config entries against an in-memory Contacts list. */
export function resolveDefaultInvitees(
  entries: readonly string[],
  contacts: readonly ContactRecord[]
): ResolvedDefaultInvitees {
  // Overlapping targeted loads can repeat the same person; count each once.
  const uniqueContacts = dedupeContactsByDisplayName(contacts);
  const emails: string[] = [];
  const unresolved: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed === '') {
      continue;
    }
    if (looksLikeEmail(trimmed)) {
      emails.push(trimmed);
      continue;
    }
    const reference = parseContactReference(trimmed);
    if (reference === undefined) {
      unresolved.push(trimmed);
      continue;
    }
    const email = emailForReference(reference, uniqueContacts);
    if (email === undefined) {
      unresolved.push(trimmed);
      continue;
    }
    emails.push(email);
  }

  return { emails, unresolved };
}

function dedupeContactsByDisplayName(
  contacts: readonly ContactRecord[]
): ContactRecord[] {
  const byDisplayName = new Map<string, ContactRecord>();
  for (const contact of contacts) {
    byDisplayName.set(contact.displayName, contact);
  }
  return [...byDisplayName.values()];
}

/**
 * Load Contacts that might match `name` (exact name/nickname, else name
 * contains). Used before {@link resolveDefaultInvitees}.
 */
export function loadContactsMatching(name: string): ContactRecord[] {
  const needle = name.trim();
  if (needle === '') {
    return [];
  }

  const script = `
set needle to "${escapeAppleScriptString(needle)}"
tell application "Contacts"
  set matches to people whose nickname is needle or name is needle
  if (count of matches) is 0 then
    set matches to people whose name contains needle
  end if
  set rows to {}
  repeat with p in matches
    set emailCount to count of emails of p
    if emailCount is not 0 then
      set nm to name of p as text
      set nk to ""
      try
        set nk to nickname of p as text
      end try
      if nk is "missing value" then
        set nk to ""
      end if
      repeat with e in emails of p
        set lab to label of e as text
        set val to value of e as text
        set end of rows to nm & tab & nk & tab & lab & tab & val
      end repeat
    end if
  end repeat
  set AppleScript's text item delimiters to linefeed
  return rows as text
end tell
`;

  let stdout: string;
  try {
    stdout = execFileSync('osascript', ['-e', script], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    throw new Error('Cannot read Apple Contacts (osascript failed).');
  }

  return parseContactsTsv(stdout);
}

/** Parse Contacts TSV rows (`name\\tnick\\tlabel\\temail`) into records. */
export function parseContactsTsv(tsv: string): ContactRecord[] {
  const byName = new Map<
    string,
    { nickname: string; emails: ContactLabeledEmail[] }
  >();

  for (const line of tsv.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    const parts = line.split('\t');
    if (parts.length < 4 || parts[3].trim() === '') {
      continue;
    }
    const displayName = parts[0];
    const nicknameRaw = parts[1];
    const label = parts[2];
    const value = parts[3].trim();
    const nickname =
      nicknameRaw === '' || nicknameRaw === 'missing value' ? '' : nicknameRaw;
    const existing = byName.get(displayName);
    const email = { label, value };
    if (existing === undefined) {
      byName.set(displayName, { nickname, emails: [email] });
    } else {
      existing.emails.push(email);
    }
  }

  return [...byName.entries()].map(([displayName, { nickname, emails }]) => ({
    displayName,
    searchableName: [displayName, nickname]
      .filter((part) => part !== '')
      .join(' '),
    emails,
  }));
}

interface ContactReference {
  readonly name: string;
  readonly label: string;
}

function parseContactReference(entry: string): ContactReference | undefined {
  const separator = entry.indexOf(':');
  if (separator <= 0 || separator === entry.length - 1) {
    return undefined;
  }
  const name = entry.slice(0, separator).trim();
  const label = entry.slice(separator + 1).trim();
  if (name === '' || label === '') {
    return undefined;
  }
  return { name, label };
}

function emailForReference(
  reference: ContactReference,
  contacts: readonly ContactRecord[]
): string | undefined {
  const contact = matchingContact(reference.name, contacts);
  if (contact === undefined) {
    return undefined;
  }
  return matchingEmail(reference.label, contact.emails)?.value;
}

function matchingContact(
  name: string,
  contacts: readonly ContactRecord[]
): ContactRecord | undefined {
  const needle = name.toLowerCase();

  const exact = contacts.filter(
    (contact) =>
      contact.searchableName.toLowerCase() === needle ||
      contact.displayName.toLowerCase() === needle
  );
  if (exact.length === 1) {
    return exact[0];
  }
  if (exact.length > 1) {
    return undefined;
  }

  const byToken = contacts.filter(
    (contact) =>
      nameTokens(contact.searchableName).has(needle) ||
      nameTokens(contact.displayName).has(needle)
  );
  if (byToken.length === 1) {
    return byToken[0];
  }
  return undefined;
}

function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token !== '')
  );
}

function matchingEmail(
  requested: string,
  emails: readonly ContactLabeledEmail[]
): ContactLabeledEmail | undefined {
  return emails.find((email) => emailLabelMatches(requested, email.label));
}

function emailLabelMatches(requested: string, rawLabel: string): boolean {
  const key = requested.toLowerCase();
  const label = rawLabel.toLowerCase();
  if (label === key) {
    return true;
  }

  const wrapped = rawLabel.match(CN_LABEL_WRAPPER)?.groups?.key.toLowerCase();
  return wrapped !== undefined && wrapped === key;
}

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) {
    return false;
  }
  const domain = value.slice(at + 1);
  if (domain === '' || !domain.includes('.')) {
    return false;
  }
  return !/\s/u.test(value);
}

function escapeAppleScriptString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
