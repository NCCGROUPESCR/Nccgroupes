import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

export const FUNDING_PROOFS_DIR = join(process.cwd(), 'uploads', 'funding-proofs');
export const CMS_IMAGES_DIR = join(process.cwd(), 'uploads', 'cms-images');
export const DOCS_FILES_DIR = join(process.cwd(), 'uploads', 'docs-files');

mkdirSync(FUNDING_PROOFS_DIR, { recursive: true });
mkdirSync(CMS_IMAGES_DIR, { recursive: true });
mkdirSync(DOCS_FILES_DIR, { recursive: true });

export const fundingProofStorage = diskStorage({
  destination: FUNDING_PROOFS_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname || '')}`);
  },
});

/** Shared upload storage for CMS content — page banners/inline images, blog
 * featured images, and staff profile photos all reuse this one endpoint. */
export const cmsImageStorage = diskStorage({
  destination: CMS_IMAGES_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname || '')}`);
  },
});

/**
 * Public URL for funding proof files.
 * Served under /v1/uploads/ so Replit's path-based proxy routes them to the API.
 */
export function fundingProofUrl(filename: string): string {
  return `/v1/uploads/funding-proofs/${filename}`;
}

/** Public URL for CMS-uploaded images. */
export function cmsImageUrl(filename: string): string {
  return `/v1/uploads/cms-images/${filename}`;
}

/** Multer storage for Documentation Center file uploads (images, PDFs, DOCX, ZIP, XLSX, videos). */
export const docsFileStorage = diskStorage({
  destination: DOCS_FILES_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname || '')}`);
  },
});

/** Public URL for docs-uploaded files. */
export function docsFileUrl(filename: string): string {
  return `/v1/uploads/docs-files/${filename}`;
}
