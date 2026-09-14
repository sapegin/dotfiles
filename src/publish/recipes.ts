import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { dirs } from '../util/files.ts';
import {
  AVIF_QUALITY,
  extractTitle,
  formatPublishedDate,
  getAllWikilinks,
  parsePublishedDate,
  getFirstImageAttachment,
  isNewer,
  parseSections,
  readNoteFile,
  resolveWikilinks,
  type VaultFrontmatter,
} from '../util/obsidian.ts';
import { toKebabCase } from '../util/text.ts';
import { log } from '../util/tui.ts';

const VAULT_DIR = path.join(dirs.obsidianVault, 'Food');

const THUMBNAIL_WIDTH = 960;
const THUMBNAIL_QUALITY = 60;

interface RecipeRaw {
  slug: string;
  createdAt: string;
  title: string;
  titleEnglish?: string;
  tags: string[];
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  ingredients: string;
  steps: string;
  keywords: string[];
  notes?: string;
  overnight: boolean;
  time?: string;
  tools?: string;
  yields?: string;
  source?: string;
  usedBy: string[];
}

function toUrl(slug: string) {
  return `/recipes/${slug}/`;
}

function toSlug(name: string) {
  const asciiName = name.normalize('NFKD').replaceAll(/[\u0300-\u036F]/g, '');
  return toKebabCase(asciiName);
}

function getSlug(frontmatter: VaultFrontmatter, baseName: string) {
  return frontmatter.slug ?? toSlug(baseName);
}

function readRecipeFile(filePath: string) {
  return readNoteFile<VaultFrontmatter>(filePath, getSlug);
}

async function copyImages(repoRoot: string, markdown: string, slug: string) {
  const imagesOutputDir = path.join(
    repoRoot,
    'sites/tacohuaco/public/images/recipes'
  );
  const filename = getFirstImageAttachment(markdown);
  if (filename === undefined) {
    return { imageUrl: undefined, thumbnailUrl: undefined };
  }

  const srcPath = path.join(dirs.obsidianAttachments, filename);
  if (fs.existsSync(srcPath) === false) {
    log.warn(`Image not found: ${srcPath}`);
    return { imageUrl: undefined, thumbnailUrl: undefined };
  }

  const destPath = path.join(imagesOutputDir, `${slug}.avif`);
  const destThumbPath = path.join(imagesOutputDir, `${slug}_thumb.avif`);

  if (isNewer(srcPath, destPath)) {
    fs.mkdirSync(imagesOutputDir, { recursive: true });
    const image = fs.readFileSync(srcPath);
    await sharp(image).avif({ quality: AVIF_QUALITY }).toFile(destPath);
    await sharp(image)
      .resize({ width: THUMBNAIL_WIDTH })
      .avif({ quality: THUMBNAIL_QUALITY })
      .toFile(destThumbPath);
  }

  if (fs.existsSync(destPath)) {
    return {
      imageUrl: `/images/recipes/${slug}.avif`,
      thumbnailUrl: `/images/recipes/${slug}_thumb.avif`,
    };
  }

  return { imageUrl: undefined, thumbnailUrl: undefined };
}

/** Sync recipes from Obsidian to the tacohuaco site in the sapegin.me monorepo. */
export async function publishRecipes(repoRoot: string): Promise<void> {
  const outputDir = path.join(repoRoot, 'content/recipes');
  const imagesOutputDir = path.join(
    repoRoot,
    'sites/tacohuaco/public/images/recipes'
  );

  console.log('Syncing recipes from Obsidian vault…\n');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(imagesOutputDir, { recursive: true });

  const files = fs
    .readdirSync(VAULT_DIR)
    .filter((filename) => filename.endsWith('.md'));
  console.log(`Found ${files.length} notes about food\n`);

  const slugMap = new Map<string, string>();
  const publishedRecipes: string[] = [];

  for (const filename of files) {
    const filePath = path.join(VAULT_DIR, filename);
    const { frontmatter, baseName, slug } = readRecipeFile(filePath);

    if (frontmatter.status !== 'published') {
      continue;
    }

    if (parsePublishedDate(frontmatter.published) === undefined) {
      log.warn(`No published date in ${filename}, skipping`);
      continue;
    }

    slugMap.set(baseName, slug);
    publishedRecipes.push(filePath);
  }

  console.log(`Found ${publishedRecipes.length} published recipes\n`);

  const usageMap = new Map<string, string[]>();

  for (const filePath of publishedRecipes) {
    const { content, slug } = readRecipeFile(filePath);

    const sections = parseSections(content);
    const ingredientsMarkdown = sections.get('Ingredients');
    if (ingredientsMarkdown === undefined) {
      continue;
    }

    const allLinkTitles = getAllWikilinks(ingredientsMarkdown);
    for (const title of allLinkTitles) {
      const refSlug = slugMap.get(title);
      if (refSlug) {
        const slugs = usageMap.get(refSlug) ?? [];
        if (!slugs.includes(slug)) {
          slugs.push(slug);
          usageMap.set(refSlug, slugs);
        }
      }
    }
  }

  let count = 0;

  for (const filePath of publishedRecipes) {
    const { frontmatter, content, baseName, slug } = readRecipeFile(filePath);

    const title = extractTitle(content);

    if (title === '') {
      log.warn(`No H1 title found in ${baseName}, skipping`);
      continue;
    }

    const outputPath = path.join(outputDir, `${slug}.json`);
    if (isNewer(filePath, outputPath) === false) {
      continue;
    }

    console.log('👉', title);

    const sections = parseSections(content);

    const dateString = formatPublishedDate(frontmatter.published);

    const ingredientsMarkdown = sections.get('Ingredients') ?? '';
    const stepsMarkdown = sections.get('Steps') ?? '';
    const descriptionMarkdown = sections.get('Description') ?? undefined;
    const notesMarkdown = sections.get('Notes') ?? undefined;
    const toolsMarkdown = sections.get('Tools') ?? undefined;
    const sourceMarkdown = sections.get('Source') ?? undefined;

    const ingredients = resolveWikilinks(ingredientsMarkdown, slugMap, toUrl);
    const steps = resolveWikilinks(stepsMarkdown, slugMap, toUrl);
    const description = descriptionMarkdown
      ? resolveWikilinks(descriptionMarkdown, slugMap, toUrl)
      : undefined;
    const notes = notesMarkdown
      ? resolveWikilinks(notesMarkdown, slugMap, toUrl)
      : undefined;

    const { imageUrl, thumbnailUrl } = await copyImages(
      repoRoot,
      content,
      slug
    );

    const tags = (frontmatter.tags ?? []).filter((tag) => tag !== 'recipes');

    const keywords = [
      ...(frontmatter.aliases ?? []),
      ...(frontmatter.keywords ? [frontmatter.keywords] : []),
    ].filter(Boolean);

    const overnight = steps.includes('overnight');

    const recipe: RecipeRaw = {
      slug,
      createdAt: dateString,
      title,
      titleEnglish: frontmatter['title-english'] ?? undefined,
      tags,
      description,
      imageUrl,
      thumbnailUrl,
      ingredients,
      steps,
      keywords,
      notes,
      overnight,
      time: frontmatter.time ?? undefined,
      tools: toolsMarkdown ?? undefined,
      yields: frontmatter.yields ?? undefined,
      source: sourceMarkdown,
      usedBy: usageMap.get(slug) ?? [],
    };

    const filepath = path.join(outputDir, `${slug}.json`);
    fs.writeFileSync(filepath, JSON.stringify(recipe, null, 2));
    console.log(`  ↪ ${filepath}`);

    count++;
  }

  const publishedSlugs = new Set(slugMap.values());
  const existingJsonFiles = fs
    .readdirSync(outputDir)
    .filter((filename) => filename.endsWith('.json'));

  let deleted = 0;
  for (const jsonFile of existingJsonFiles) {
    const slug = path.parse(jsonFile).name;
    if (publishedSlugs.has(slug) === false) {
      const jsonPath = path.join(outputDir, jsonFile);
      const imagePath = path.join(imagesOutputDir, `${slug}.avif`);
      const thumbPath = path.join(imagesOutputDir, `${slug}_thumb.avif`);

      fs.unlinkSync(jsonPath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }

      console.log(`🗑️  Deleted ${slug}`);
      deleted++;
    }
  }

  console.log();
  console.log(`${count} recipes synced, ${deleted} deleted`);
}
