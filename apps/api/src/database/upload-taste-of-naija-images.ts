#!/usr/bin/env ts-node
/**
 * Taste of Naija Menu Image Upload
 *
 * Uploads the menu photos to Cloudinary and records the delivered URLs in
 * `seeds/taste-of-naija-cloudinary-urls.json`. The generator embeds that map
 * into `seeds/taste-of-naija-menu.data.ts`, which the seed script upserts.
 *
 * Public IDs are deterministic (`<root>/taste-of-naija/<folder>/<file>`), so
 * re-running the upload overwrites the same asset instead of creating a
 * duplicate.
 *
 * Usage:
 *   # Locally via ts-node:
 *   pnpm --filter @rsc/api upload:images:taste-of-naija [--dry-run] [--images-dir=<path>]
 *
 *   # Inside API container (production build):
 *   node dist/src/database/upload-taste-of-naija-images.js --images-dir=/app/menu-images
 */
import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs, promisify } from "node:util";

import { config as loadEnvironment } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const execFileAsync = promisify(execFile);

loadEnvironment();

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "images-dir": { type: "string" },
    out: { type: "string" },
  },
});

const DRY_RUN = Boolean(args["dry-run"]);
const IMAGES_DIR = resolve(
  args["images-dir"] ?? process.env.MENU_IMAGES_DIR ?? "/Users/justin/Desktop/DO/TASTE OF NAIJA",
);
const OUT_PATH = resolve(
  args.out ?? join(__dirname, "seeds", "taste-of-naija-cloudinary-urls.json"),
);
const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER ?? "rsc";
const OUTLET_SLUG = "taste-of-naija";

interface UrlMap {
  [key: string]: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const BROWSER_UNSAFE_EXTENSIONS = new Set([".heic", ".heif"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION_PX = 1600;
const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_ATTEMPTS = 3;

function isBrowserSafe(filePath: string): boolean {
  return !BROWSER_UNSAFE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

async function prepareForUpload(sourcePath: string): Promise<string | null> {
  const extension = extname(sourcePath).toLowerCase();
  const needsResize = !isBrowserSafe(sourcePath) || extension === ".png";
  let stats: Stats;
  try {
    stats = await stat(sourcePath);
  } catch {
    return null;
  }
  const needsDownscale = stats.size > MAX_UPLOAD_BYTES;
  if (!needsResize && !needsDownscale) {
    return sourcePath;
  }

  const targetPath = join(
    await mkdtemp(join(tmpdir(), "taste-of-naija-upload-")),
    `${basename(sourcePath, extname(sourcePath))}.jpg`,
  );

  try {
    await execFileAsync("sips", [
      "-Z",
      String(MAX_DIMENSION_PX),
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "80",
      sourcePath,
      "--out",
      targetPath,
    ]);
    return targetPath;
  } catch {
    console.warn(`  ! could not resize ${basename(sourcePath)}`);
    return null;
  }
}

async function uploadWithRetry(
  filePath: string,
  publicId: string,
): Promise<{ secure_url: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      return await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        timeout: UPLOAD_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      lastError = error;
      console.warn(`  ! attempt ${attempt}/${UPLOAD_ATTEMPTS} failed for ${publicId}`);
      if (attempt < UPLOAD_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Cloudinary upload failed");
}

async function readUrlMap(): Promise<UrlMap> {
  if (!existsSync(OUT_PATH)) {
    return {};
  }
  try {
    const raw = await readFile(OUT_PATH, "utf8");
    return JSON.parse(raw) as UrlMap;
  } catch {
    console.warn(`! could not read ${OUT_PATH}, starting a fresh map`);
    return {};
  }
}

async function writeUrlMap(map: UrlMap): Promise<void> {
  await mkdir(dirname(OUT_PATH), { recursive: true });
  const sorted: UrlMap = {};
  for (const key of Object.keys(map).sort()) {
    const value = map[key];
    if (value !== undefined) {
      sorted[key] = value;
    }
  }
  await writeFile(OUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function collectImageFiles(): string[] {
  const sources: string[] = [];

  function walk(dir: string, prefix: string): void {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const relative = prefix ? `${prefix}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, relative);
      } else if (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) {
        sources.push(relative);
      }
    }
  }

  walk(IMAGES_DIR, "");
  return sources.sort();
}

async function main(): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

  const sources = collectImageFiles();
  const urlMap = await readUrlMap();

  console.log(`\n🍛  TASTE OF NAIJA IMAGE UPLOAD`);
  console.log(`=================================================`);
  console.log(`   Images dir : ${IMAGES_DIR}`);
  console.log(`   Cloudinary : ${cloudName || "<not configured>"}`);
  console.log(`   Dry run    : ${DRY_RUN}`);
  console.log(`   Images     : ${sources.length}`);
  console.log(`=================================================\n`);

  if (!DRY_RUN) {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required",
      );
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  let uploaded = 0;
  let reused = 0;
  let skipped = 0;

  for (const source of sources) {
    const filePath = join(IMAGES_DIR, source);
    if (!existsSync(filePath)) {
      console.warn(`  ! missing file: ${source}`);
      skipped++;
      continue;
    }

    const segments = source.split("/");
    const fileName = segments.pop() ?? "";
    const publicId = [
      ROOT_FOLDER,
      OUTLET_SLUG,
      ...segments.map(slugify),
      slugify(fileName.replace(/\.[a-z0-9]+$/i, "")),
    ].join("/");

    const existing = urlMap[source];
    if (existing) {
      reused++;
      continue;
    }

    let uploadPath = filePath;
    if (!DRY_RUN) {
      const prepared = await prepareForUpload(filePath);
      if (!prepared) {
        skipped++;
        continue;
      }
      uploadPath = prepared;
    }

    if (DRY_RUN) {
      console.log(`  → ${source} -> ${publicId}`);
      uploaded++;
      continue;
    }

    try {
      const result = await uploadWithRetry(uploadPath, publicId);
      urlMap[source] = result.secure_url;
      // Also store by basename so the generator can look up by filename alone.
      urlMap[basename(source)] = result.secure_url;
      // Persist after every upload so an interrupted run resumes cleanly.
      await writeUrlMap(urlMap);
      uploaded++;
      console.log(`  ✓ ${source} -> ${result.secure_url}`);
    } catch (error: unknown) {
      console.error(`  ✗ ${source}: ${error instanceof Error ? error.message : "upload failed"}`);
      skipped++;
    }
  }

  if (!DRY_RUN) {
    await writeUrlMap(urlMap);
  }

  console.log(`\n=================================================`);
  console.log(`   Uploaded : ${uploaded}`);
  console.log(`   Reused   : ${reused}`);
  console.log(`   Skipped  : ${skipped}`);
  if (DRY_RUN) {
    console.log(`\n⚠️   DRY-RUN completed. Nothing was uploaded.`);
  } else {
    console.log(`   Map      : ${OUT_PATH}`);
  }
  console.log(`=================================================\n`);
}

void main().catch((error: unknown) => {
  console.error(
    "❌ Fatal error during image upload:",
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  process.exitCode = 1;
});
