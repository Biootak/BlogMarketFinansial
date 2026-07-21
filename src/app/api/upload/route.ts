// Apply sharp process-wide tuning (cache=false, concurrency=2) before any
// route handler runs. Idempotent — safe to re-import across hot reloads.
import '@/lib/sharp-config';

import { auth } from '@/auth';
import { checkRateLimit as checkSharedRateLimit } from '@/lib/rate-limiter';
import { uploadFile } from '@/lib/storage';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// ---------- constants ------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 10;
// C5 fix: SVG removed from the allowlist. A regex blocklist sanitizer for
// SVG is trivially bypassable (e.g. <style>/<foreignObject>/<use>), and the
// file is then served with Content-Type image/svg+xml + nosniff, so it can
// execute as a document and steal the session. Only serve raster formats.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'] as const;

// soft max-width for the canonical rendition. We do NOT generate multiple
// variants — the upload route returns one WebP (or the original mime for
// SVG/GIF) and next/image handles responsive sizing at request time.
const MAX_CANONICAL_WIDTH = 1920;
const WEBP_QUALITY = 85;

// Magic-byte signatures — catches MIME spoofing before we touch the pixel
// pipeline. SVG is checked separately because it's text, not binary.
const FILE_SIGNATURES: Record<string, readonly (readonly number[])[]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

// ---------- types ----------------------------------------------------------

type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];
type AllowedMime = (typeof ALLOWED_TYPES)[number];

interface ProcessedFile {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
  width: number | null;
  height: number | null;
  mime: string;
}

// ---------- rate limiter --------------------------------------------------
// Use the shared Redis-backed limiter so the cap is enforced across all
// instances (the previous in-memory Map was trivially bypassed by hitting
// different pods in a horizontally-scaled deployment).

// ---------- validation helpers --------------------------------------------

function validateFileSignature(buffer: Buffer, mimeType: AllowedMime): boolean {
  const sigs = FILE_SIGNATURES[mimeType];
  if (!sigs) return false;
  return sigs.some((sig) => {
    for (let i = 0; i < sig.length; i += 1) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}

// ---------- single sharp pipeline per file --------------------------------
// One instance is built per file and reused for metadata + resize + encode.
// This keeps the libvips decoded pixel buffer alive only for the lifetime
// of this single file's processing — no variant fan-out, no re-decoding.
interface OptimizeResult {
  buffer: Buffer;
  width: number | null;
  height: number | null;
  mime: AllowedMime;
}

async function processImage(input: Buffer, mime: AllowedMime): Promise<OptimizeResult> {
  if (mime === 'image/gif') {
    // Animated GIFs must be preserved as-is (re-encoding drops frames).
    const meta = await sharp(input, { animated: true }).metadata();
    return {
      buffer: input,
      width: typeof meta.width === 'number' ? meta.width : null,
      height: typeof meta.height === 'number' ? meta.height : null,
      mime,
    };
  }

  // ── Smart pass-through for already-optimal uploads ───────────────────────
  // Reading metadata is ~10ms vs 500ms+ for decode+encode. We peek first
  // to avoid expensive reprocessing of images that don't need it.
  const meta = await sharp(input).metadata();
  const sourceWidth = typeof meta.width === 'number' ? meta.width : 0;
  const sourceHeight = typeof meta.height === 'number' ? meta.height : null;
  const needsResize = sourceWidth > MAX_CANONICAL_WIDTH;

  // Fast path: WebP that is already within canonical size limits AND under
  // a reasonable file-size threshold (300 KB). Re-encoding would be pure
  // waste — decode → lossy recompress at q85 → slightly worse quality +
  // same visual result. We pass it through as-is.
  // 300 KB is generous: a 1920×1080 photo-quality WebP is ~150–200 KB.
  // Anything larger is either already bloated (rare) or a screenshot
  // that benefits from re-encoding.
  const SIZE_THRESHOLD_BYTES = 300 * 1024;
  if (mime === 'image/webp' && !needsResize && input.byteLength <= SIZE_THRESHOLD_BYTES) {
    return {
      buffer: input,
      width: sourceWidth,
      height: sourceHeight,
      mime: 'image/webp',
    };
  }

  // Fast path 2: PNG/JPEG that already fits within canonical limits.
  // We convert to WebP for consistency (smaller files, better browser
  // support), but skip the resize step since the image is already
  // acceptable in size. Only the format conversion happens.
  const shouldConvertToWebp =
    mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp';

  if (shouldConvertToWebp && !needsResize) {
    // Convert format only — no resize needed.
    const buffer = await sharp(input).webp({ quality: WEBP_QUALITY }).toBuffer();
    const finalMeta = await sharp(buffer).metadata();
    return {
      buffer,
      width: typeof finalMeta.width === 'number' ? finalMeta.width : null,
      height: typeof finalMeta.height === 'number' ? finalMeta.height : null,
      mime: 'image/webp',
    };
  }

  // Full pipeline: resize (if needed) + WebP encode.
  const pipeline = sharp(input);
  const out = needsResize
    ? pipeline.resize(MAX_CANONICAL_WIDTH, undefined, { withoutEnlargement: true })
    : pipeline;

  const buffer = await out.webp({ quality: WEBP_QUALITY }).toBuffer();

  // Dimensions may have changed after resize — re-read from the encoded buffer.
  // This is a cheap metadata probe (no re-decode of pixels for the values we
  // need) and gives the caller accurate width/height for the file on disk.
  const finalMeta = await sharp(buffer).metadata();

  return {
    buffer,
    width: typeof finalMeta.width === 'number' ? finalMeta.width : null,
    height: typeof finalMeta.height === 'number' ? finalMeta.height : null,
    mime: 'image/webp',
  };
}

// ---------- filename -------------------------------------------------------
// collision-safe: timestamp (ms) + 6-char base36 random + sanitized base.
// `Math.random` is acceptable here because collisions only cause an overwrite
// of an identical-content file, not a security issue — and the random
// component gives ~2B namespace per millisecond.
function generateFilename(originalName: string, mime: AllowedMime): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const baseName =
    originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 20) || 'image';

  const ext = mime === 'image/gif' ? originalName.split('.').pop()?.toLowerCase() || 'bin' : 'webp';

  return `${timestamp}-${random}-${baseName}.${ext}`;
}

// ---------- per-file processing --------------------------------------------

interface FileSuccess {
  ok: true;
  data: ProcessedFile;
}
interface FileFailure {
  ok: false;
  code: string;
  message: string;
  filename?: string;
}
type FileOutcome = FileSuccess | FileFailure;

async function processOneFile(file: File, folder: AllowedFolder): Promise<FileOutcome> {
  const startMs = performance.now();
  // Timing helper — noop in all environments (no console output)
  const logStep = (_label: string) => { void startMs; };

  if (!ALLOWED_TYPES.includes(file.type as AllowedMime)) {
    return {
      ok: false,
      code: 'INVALID_FILE_TYPE',
      message: `نوع فایل ${file.type} مجاز نیست`,
      filename: file.name,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: 'حجم فایل بیشتر از 10MB است',
      filename: file.name,
    };
  }

  const mime = file.type as AllowedMime;
  const buffer = Buffer.from(await file.arrayBuffer());
  logStep('received');

  if (!validateFileSignature(buffer, mime)) {
    return {
      ok: false,
      code: 'INVALID_FILE_CONTENT',
      message: 'محتوای فایل با پسوند آن همخوانی ندارد',
      filename: file.name,
    };
  }

  try {
    const optimized = await processImage(buffer, mime);
    logStep('processed');
    const filename = generateFilename(file.name, mime);

    const stored = await uploadFile(optimized.buffer, filename, folder, optimized.mime, {
      width: optimized.width,
      height: optimized.height,
    });
    logStep('stored');

    return {
      ok: true,
      data: {
        url: stored.url,
        s3Url: stored.s3Url,
        localPath: stored.localPath,
        filename: stored.filename,
        size: stored.size,
        width: optimized.width,
        height: optimized.height,
        mime: optimized.mime,
      },
    };
  } catch {
    return {
      ok: false,
      code: 'PROCESSING_FAILED',
      message: 'خطا در پردازش تصویر',
      filename: file.name,
    };
  }
}

// ---------- route handler --------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'احراز هویت الزامی است' } },
        { status: 401 },
      );
    }

    if (!(await checkSharedRateLimit(session.user.id, 'upload')).success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'تعداد درخواست‌های شما بیش از حد مجاز است',
          },
        },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folder = (formData.get('folder') as string) || 'general';

    if (!ALLOWED_FOLDERS.includes(folder as AllowedFolder)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FOLDER', message: 'فولدر نامعتبر است' } },
        { status: 400 },
      );
    }

    // L4 fix: the `ads` folder holds admin-designated marketing assets.
    // Restrict writes there to ADMIN/OWNER; every other role may only use
    // their own-purpose folders (avatars/posts/etc.).
    const role = (session.user as { role?: string }).role;
    if (folder === 'ads' && role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    // Storage-abuse hardening: a plain USER may only manage their own avatar.
    // Post/category/tag/general/ads writes require at least AUTHOR. Without
    // this, any authenticated reader could fill S3 with arbitrary files.
    if (folder !== 'avatars' && role !== 'AUTHOR' && role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'دسترسی برای آپلود در این بخش وجود ندارد' },
        },
        { status: 403 },
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILES', message: 'فایلی انتخاب نشده' } },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: `حداکثر ${MAX_FILES_PER_REQUEST} فایل مجاز است`,
          },
        },
        { status: 400 },
      );
    }

    // Process all files in parallel. Each file is independent (its own sharp
    // pipeline, its own storage write), so Promise.allSettled lets us:
    //   1. start them concurrently (no head-of-line blocking on a 10-image batch)
    //   2. surface partial failures — one bad file doesn't poison the others
    // Per-file outcomes are split into successes and failures; the response
    // is a 200 with per-file status unless *every* file failed.
    const outcomes = await Promise.all(
      files.map((f) => processOneFile(f, folder as AllowedFolder)),
    );

    const successes = outcomes.filter((o): o is FileSuccess => o.ok);
    const failures = outcomes.filter((o): o is FileFailure => !o.ok);

    // If everything failed, return a 400 so the client can show a single error.
    if (successes.length === 0) {
      const first = failures[0] ?? { code: 'UNKNOWN_ERROR', message: 'خطای ناشناخته' };
      return NextResponse.json(
        {
          success: false,
          error: {
            code: first.code,
            message: first.message,
            // Surface per-file failures so the UI can attribute them
            details: failures.map((f) => ({
              filename: f.filename,
              code: f.code,
              message: f.message,
            })),
          },
        },
        { status: 400 },
      );
    }

    // folder از ابتدا به processOneFile پاس داده شده، پس URL ها صحیح‌اند
    // (هم S3 path هم local path با فولدر درست ساخته شده‌اند).
    const data = successes.map((s) => s.data);

    return NextResponse.json({
      success: true,
      data: {
        files: data,
        failures: failures.map((f) => ({ filename: f.filename, code: f.code, message: f.message })),
        message: 'فایل‌ها با موفقیت آپلود شدند',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: 'خطا در آپلود فایل' } },
      { status: 500 },
    );
  }
}

// maxDuration is set to 60s to give sharp enough time on large batches.
// On a 10×10MB batch the bottleneck is sharp.encode + 10 parallel
// storage writes — all comfortably under 60s on a typical server.
export const maxDuration = 60;
