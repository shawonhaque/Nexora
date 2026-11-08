import { requireClient, run } from './base';
import type { Result } from '../lib/errors';

export type BucketName = 'nexora-images' | 'nexora-pdfs' | 'nexora-private';

/** Accepted image types for the public image bucket. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadOptions {
  bucket: BucketName;
  /** Path within the bucket, e.g. `news/my-article-cover.webp`. */
  path: string;
  file: File;
  /** Signed URL lifetime in seconds for private/restricted files. */
  signedUrlExpirySeconds?: number;
}

function validate(file: File, bucket: BucketName): string | null {
  const isImage = bucket === 'nexora-images';
  const allowed = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  const limit = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;

  if (!allowed.includes(file.type)) {
    return `Unsupported file type "${file.type || 'unknown'}". Allowed: ${allowed.join(', ')}.`;
  }
  if (file.size > limit) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is ${limit / 1024 / 1024} MB.`;
  }
  return null;
}

/** Builds a collision-resistant, filesystem-safe object path. */
export function buildStoragePath(folder: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin';
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${folder.replace(/^\/|\/$/g, '')}/${base || 'file'}-${unique}.${ext}`;
}

export const storageService = {
  async upload(options: UploadOptions): Promise<Result<string>> {
    const invalid = validate(options.file, options.bucket);
    if (invalid) {
      return run(async () => {
        throw new Error(invalid);
      });
    }
    return run(async () => {
      const client = requireClient();
      const { error } = await client.storage
        .from(options.bucket)
        .upload(options.path, options.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: options.file.type,
        });
      if (error) throw error;

      if (options.bucket === 'nexora-private' || options.bucket === 'nexora-pdfs') {
        // Restricted objects are only ever handed out as short-lived signed URLs.
        const { data, error: signError } = await client.storage
          .from(options.bucket)
          .createSignedUrl(options.path, options.signedUrlExpirySeconds ?? 3600);
        if (signError) throw signError;
        return data.signedUrl;
      }

      const { data } = client.storage.from(options.bucket).getPublicUrl(options.path);
      return data.publicUrl;
    });
  },

  /** Short-lived URL for a restricted or private object. */
  async createSignedUrl(
    bucket: BucketName,
    path: string,
    expiresInSeconds = 3600
  ): Promise<Result<string>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .storage.from(bucket)
        .createSignedUrl(path, expiresInSeconds);
      if (error) throw error;
      return data.signedUrl;
    });
  },

  async remove(bucket: BucketName, paths: string[]): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().storage.from(bucket).remove(paths);
      if (error) throw error;
      return true as const;
    });
  },

  async list(bucket: BucketName, folder = ''): Promise<Result<{ name: string; updated_at: string | null }[]>> {
    return run(async () => {
      const { data, error } = await requireClient().storage.from(bucket).list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data ?? []).map((item) => ({ name: item.name, updated_at: item.updated_at ?? null }));
    });
  },
};
