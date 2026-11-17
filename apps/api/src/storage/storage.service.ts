import { Injectable } from '@nestjs/common';

/**
 * Generates short-lived signed URLs for private Bilty & ID card images.
 * Replace the stubbed URL builder with AWS SDK / Cloudflare R2 presigner in production.
 */
@Injectable()
export class StorageService {
  private readonly ttlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 60);

  createSignedReadUrl(objectKey: string): { url: string; expiresAt: string } {
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000).toISOString();
    const bucket = process.env.S3_BUCKET ?? 'cargo-private-docs';
    const url = `https://storage.example.local/${bucket}/${encodeURIComponent(objectKey)}?expires=${encodeURIComponent(expiresAt)}`;
    return { url, expiresAt };
  }
}
