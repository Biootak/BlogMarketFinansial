/**
 * image-dims — shared helpers for handling image upload results.
 * --------------------------------------------------------------------------
 * Centralizes the shape that every form needs after a successful upload:
 *   - which URL to save
 *   - which width/height to save alongside it (CLS prevention + responsive)
 *
 * Usage:
 *   const handleUploadComplete = (files: UploadedFile[]) => {
 *     const { url, width, height } = pickDims(files);
 *     if (!url) return;
 *     form.setValue('featuredImage', url);
 *     form.setValue('featuredImageWidth', width);
 *     form.setValue('featuredImageHeight', height);
 *   };
 */

import type { UploadedFile } from '@/components/ImageUpload/ImageUploader';

export interface DimsResult {
  url: string;
  width: number | null;
  height: number | null;
}

export function pickDims(files: UploadedFile[] | undefined | null): DimsResult | null {
  const f = files?.[0];
  if (!f) return null;
  return {
    url: f.url,
    width: typeof f.width === 'number' && f.width > 0 ? f.width : null,
    height: typeof f.height === 'number' && f.height > 0 ? f.height : null,
  };
}

export function pickMany(files: UploadedFile[] | undefined | null): DimsResult[] {
  if (!files) return [];
  return files
    .map((f) => ({
      url: f.url,
      width: typeof f.width === 'number' && f.width > 0 ? f.width : null,
      height: typeof f.height === 'number' && f.height > 0 ? f.height : null,
    }))
    .filter((d) => d.url);
}
