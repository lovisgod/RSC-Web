#!/usr/bin/env ts-node
/**
 * Salmas Menu Image Upload
 *
 * Uploads the worksheet photos to Cloudinary and records the delivered URLs in
 * `seeds/salmas-cloudinary-urls.json`. The generator embeds that map into
 * `seeds/salmas-menu.data.ts`, which the seed script then upserts.
 *
 * Public IDs are deterministic (`<root>/salmas/<folder>/<file>`), so re-running
 * the upload overwrites the same asset instead of creating a duplicate.
 *
 * Usage:
 *   # Locally via ts-node:
 *   pnpm --filter @rsc/api upload:images:salmas [--dry-run] [--images-dir=<path>]
 *
 *   # Inside API container (production build):
 *   node dist/src/database/upload-salmas-images.js --images-dir=/app/menu-images
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs, promisify } from "node:util";

import { config as loadEnvironment } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

import { salmasMenuData } from "./seeds/salmas-menu.data";

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
  args["images-dir"] ?? process.env.MENU_IMAGES_DIR ?? "/Users/justin/Desktop/DO/SALMAS NEW QR",
);
const OUT_PATH = resolve(args.out ?? join(__dirname, "seeds", "salmas-cloudinary-urls.json"));
const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER ?? "rsc";
const OUTLET_SLUG = "salmas";

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

/** Cloudinary delivers HEIC as HEIC, which browsers cannot render. */
const BROWSER_UNSAFE_EXTENSIONS = new Set([".heic", ".heif"]);

/** Cloudinary rejects uploads above 10MB, and menu photos are far larger. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION_PX = 1600;
const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_ATTEMPTS = 3;

function isBrowserSafe(filePath: string): boolean {
  return !BROWSER_UNSAFE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/**
 * Menu photos are shot on phones and weigh 2-18MB. Cloudinary rejects files
 * above 10MB, so every photo is downscaled before it is sent.
 */
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
    await mkdtemp(join(tmpdir(), "salmas-upload-")),
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

function collectImageSources(): string[] {
  const sources = new Set<string>();
  for (const category of salmasMenuData.categories) {
    for (const item of category.items) {
      if (item.imageSource) {
        sources.add(item.imageSource);
      }
    }
  }
  return [...sources].sort();
}

async function main(): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

  const sources = collectImageSources();
  const urlMap = await readUrlMap();

  console.log(`\n🖼️  SALMAS IMAGE UPLOAD`);
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
      urlMap[basename(source)] = result.secure_url;
      // Persisted after every upload so an interrupted run resumes instead of
      // re-uploading from the first photo.
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
