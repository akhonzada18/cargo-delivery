import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Private document storage with HMAC-signed short-lived read URLs.
 * Stores files in a local private `.uploads/` directory for dev/MVP;
 * swap with S3/Cloudflare R2 presigned URLs in production.
 */
@Injectable()
export class StorageService {
  private readonly ttlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 60);
  private readonly secret = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-change-in-prod';
  private readonly uploadDir = path.resolve(process.cwd(), '.uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveBase64Image(dataUrl: string, prefix: string): { objectKey: string } {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('Invalid image data URL');
    }
    const mime = match[1];
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const buffer = Buffer.from(match[2], 'base64');
    const objectKey = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(this.uploadDir, objectKey), buffer);
    return { objectKey };
  }

  createSignedReadUrl(objectKey: string): { url: string; expiresAt: string } {
    const expMs = Date.now() + this.ttlSeconds * 1000;
    const expiresAt = new Date(expMs).toISOString();
    const payload = `${objectKey}:${expMs}`;
    const sig = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    const baseUrl = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const url = `${baseUrl}/storage/file?key=${encodeURIComponent(objectKey)}&exp=${expMs}&sig=${sig}`;
    return { url, expiresAt };
  }

  readSignedFile(objectKey: string, exp: string, sig: string): { buffer: Buffer; mimeType: string } {
    const expMs = Number(exp);
    if (!expMs || Date.now() > expMs) {
      throw new UnauthorizedException('Signed document URL has expired');
    }
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(`${objectKey}:${expMs}`)
      .digest('hex');
    if (sig !== expectedSig) {
      throw new UnauthorizedException('Invalid document signature');
    }

    const safeName = path.basename(objectKey);
    const filePath = path.join(this.uploadDir, safeName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Document not found');
    }

    const ext = path.extname(safeName).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return { buffer: fs.readFileSync(filePath), mimeType };
  }
}
