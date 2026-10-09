import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  areFilesEqual,
  copyFile,
  dirs,
  writeFileIfDifferent,
} from '../util/files.ts';
import {
  extractTitle,
  formatMarkdown,
  formatMarkdownImage,
  formatPublishedDate,
  getObsidianImageEmbedFilenames,
  hasTag,
  LINKED_IMAGE_EMBED_PATTERN,
  parseFrontmatter,
  parsePublishedDate,
  readNoteFile,
  resolveWikilinks,
  STANDALONE_IMAGE_EMBED_PATTERN,
  stripPrivateNotes,
  stripTitle,
  type VaultFrontmatter,
} from '../util/obsidian.ts';
import { log } from '../util/tui.ts';

const VAULT_DIR = path.join(dirs.obsidianVault, 'Blog');
const BLOCKS_VAULT_DIR = path.join(VAULT_DIR, 'blocks');
const ATTACHMENTS_DIR = dirs.obsidianAttachments;

const EMOJI_SEQUENCE_REGEXP =
  /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

function getImagePublicPath(filename: string) {
  return `/images/blog/${filename}`;
}

async function copyImage(repoRoot: string, filename: string): Promise<void> {
  const sourcePath = path.join(ATTACHMENTS_DIR, filename);
  if (fs.existsSync(sourcePath) === false) {
    log.warn(`Image not found: ${sourcePath}`);
    return;
  }

  const destPath = path.join(
    repoRoot,
    'sites/sapegin.me/public/images/blog',
    filename
  );

  if ((await areFilesEqual(sourcePath, destPath)) === false) {
    await copyFile(sourcePath, destPath);
  }
}

async function syncBlogImages(
  repoRoot: string,
  content: string
): Promise<void> {
  const filenames = getObsidianImageEmbedFilenames(content);
  await Promise.all(filenames.map((filename) => copyImage(repoRoot, filename)));
}

function resolveImageEmbeds(content: string) {
  let updated = content.replaceAll(
    new RegExp(LINKED_IMAGE_EMBED_PATTERN, 'g'),
    (_match, filename: string, alt: string | undefined, linkTarget: string) => {
      const imageMarkdown = formatMarkdownImage(
        getImagePublicPath(filename),
        alt !== undefined && alt.length > 0 ? alt : undefined
      );
      return `[${imageMarkdown}](${linkTarget})`;
    }
  );

  updated = updated.replaceAll(
    new RegExp(STANDALONE_IMAGE_EMBED_PATTERN, 'g'),
    (_match, filename: string, alt: string | undefined) => {
      return formatMarkdownImage(
        getImagePublicPath(filename),
        alt !== undefined && alt.length > 0 ? alt : undefined
      );
    }
  );

  return updated;
}

function rewriteSiteUrls(content: string) {
  return content
    .replaceAll(/\]\((?:https?:)?\/\/sapegin\.me\/?\)/g, '](/)')
    .replaceAll(/\]\((?:https?:)?\/\/sapegin\.me(\/[^)]*)\)/g, ']($1)');
}

function wrapEmojisInLine(line: string) {
  return line.replaceAll(EMOJI_SEQUENCE_REGEXP, (emoji) => {
    return `<span aria-hidden="true">${emoji}</span>`;
  });
}

function wrapEmojisInAriaHidden(content: string) {
  const lines = content.split('\n');
  let inFence = false;

  return lines
    .map((line) => {
      if (line.trimStart().startsWith('```')) {
        inFence = inFence === false;
        return line;
      }

      if (inFence) {
        return line;
      }

      return wrapEmojisInLine(line);
    })
    .join('\n');
}

function transformMarkdown(
  repoRoot: string,
  content: string,
  slugMap: Map<string, string>
) {
  return wrapEmojisInAriaHidden(
    rewriteSiteUrls(
      resolveWikilinks(
        resolveImageEmbeds(content),
        slugMap,
        (slug) => `/blog/${slug}/`
      )
    )
  );
}

function transformBody(
  repoRoot: string,
  content: string,
  slugMap: Map<string, string>
) {
  return transformMarkdown(repoRoot, stripTitle(content), slugMap);
}

function transformBlockBody(
  repoRoot: string,
  content: string,
  slugMap: Map<string, string>
) {
  return transformMarkdown(repoRoot, stripPrivateNotes(content), slugMap);
}

function isWashingCodeFile(filePath: string) {
  const rawMarkdown = fs.readFileSync(filePath, 'utf8').trimStart();
  const { frontmatter } = parseFrontmatter<{ tags?: string[] }>(rawMarkdown);
  return hasTag(frontmatter, 'washingcode');
}

function runOxfmt(repoRoot: string, globs: string[]) {
  const oxfmtBin = path.join(repoRoot, 'node_modules', '.bin', 'oxfmt');
  if (fs.existsSync(oxfmtBin) === false) {
    log.warn('Oxfmt not found, skipping format');
    return;
  }

  execSync(
    `"${oxfmtBin}" --write ${globs.map((glob) => `"${glob}"`).join(' ')}`,
    { cwd: repoRoot, stdio: 'inherit' }
  );
}

/** Sync blog posts and blocks from Obsidian to the sapegin.me monorepo. */
export async function publishSite(repoRoot: string): Promise<void> {
  const outputDir = path.join(repoRoot, 'content/blog');
  const blocksOutputDir = path.join(repoRoot, 'content/blocks');
  const imagesDir = path.join(repoRoot, 'sites/sapegin.me/public/images/blog');

  console.log('Syncing blog from Obsidian vault…\n');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });

  const files = fs
    .readdirSync(VAULT_DIR)
    .filter((filename) => filename.endsWith('.md'));

  console.log(`Found ${files.length} notes in vault\n`);

  const slugMap = new Map<string, string>();
  const publishedFiles: string[] = [];

  for (const filename of files) {
    const filePath = path.join(VAULT_DIR, filename);
    const { frontmatter, baseName, slug } = readNoteFile<VaultFrontmatter>(
      filePath,
      (noteFrontmatter) => {
        if (typeof noteFrontmatter.slug !== 'string') {
          throw new TypeError(`Missing slug in ${filename}`);
        }

        return noteFrontmatter.slug;
      }
    );

    if (frontmatter.status !== 'published') {
      continue;
    }

    if (parsePublishedDate(frontmatter.published) === undefined) {
      log.warn(`No published date in ${filename}, skipping`);
      continue;
    }

    slugMap.set(baseName, slug);
    publishedFiles.push(filePath);
  }

  console.log(`Found ${publishedFiles.length} published posts\n`);

  let synced = 0;

  for (const filePath of publishedFiles) {
    const { frontmatter, content, slug } = readNoteFile<VaultFrontmatter>(
      filePath,
      (noteFrontmatter) => noteFrontmatter.slug as string
    );

    const title = extractTitle(content);
    if (title === '') {
      log.warn(`No H1 title found in ${filePath}, skipping`);
      continue;
    }

    const outputPath = path.join(outputDir, `${slug}.md`);

    await syncBlogImages(repoRoot, content);

    const body = transformBody(repoRoot, content, slugMap);
    const outputMarkdown = formatMarkdown(
      {
        title,
        description: frontmatter.description,
        date: formatPublishedDate(frontmatter.published),
        tags: frontmatter.tags ?? [],
      },
      body
    );

    if (
      (await writeFileIfDifferent(outputPath, outputMarkdown, title)) ===
      'unchanged'
    ) {
      continue;
    }

    synced++;
  }

  const publishedSlugs = new Set(slugMap.values());
  const existingFiles = fs
    .readdirSync(outputDir)
    .filter((filename) => filename.endsWith('.md'));

  let deleted = 0;

  for (const filename of existingFiles) {
    const slug = path.parse(filename).name;
    const filePath = path.join(outputDir, filename);

    if (publishedSlugs.has(slug) || isWashingCodeFile(filePath)) {
      continue;
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️  Deleted ${slug}`);
    deleted++;
  }

  console.log();
  console.log(`${synced} posts synced, ${deleted} deleted`);

  fs.mkdirSync(blocksOutputDir, { recursive: true });

  let blocksSynced = 0;

  if (fs.existsSync(BLOCKS_VAULT_DIR)) {
    console.log();
    console.log('Syncing blocks…\n');

    const blockFiles = fs
      .readdirSync(BLOCKS_VAULT_DIR)
      .filter((filename) => filename.endsWith('.md'));

    const blockSlugs = new Set<string>();

    for (const filename of blockFiles) {
      const filePath = path.join(BLOCKS_VAULT_DIR, filename);
      const { content, slug } = readNoteFile<VaultFrontmatter>(
        filePath,
        (noteFrontmatter) => {
          if (typeof noteFrontmatter.slug !== 'string') {
            throw new TypeError(`Missing slug in ${filename}`);
          }

          return noteFrontmatter.slug;
        }
      );

      blockSlugs.add(slug);

      const outputPath = path.join(blocksOutputDir, `${slug}.md`);

      await syncBlogImages(repoRoot, content);

      const body = transformBlockBody(repoRoot, content, slugMap);
      const outputMarkdown = `${body.trim()}\n`;
      if (
        (await writeFileIfDifferent(
          outputPath,
          outputMarkdown,
          `🧱 ${slug}`
        )) === 'unchanged'
      ) {
        continue;
      }

      blocksSynced++;
    }

    const existingBlocks = fs
      .readdirSync(blocksOutputDir)
      .filter((filename) => filename.endsWith('.md'));

    let blocksDeleted = 0;

    for (const filename of existingBlocks) {
      const slug = path.parse(filename).name;

      if (blockSlugs.has(slug)) {
        continue;
      }

      fs.unlinkSync(path.join(blocksOutputDir, filename));
      console.log(`🗑️  Deleted block ${slug}`);
      blocksDeleted++;
    }

    console.log();
    console.log(`${blocksSynced} blocks synced, ${blocksDeleted} deleted`);
  }

  console.log();
  console.log('Formatting…');
  runOxfmt(repoRoot, [
    path.join(outputDir, '**/*.md'),
    path.join(blocksOutputDir, '**/*.md'),
  ]);

  console.log('Done 🦜');
}
