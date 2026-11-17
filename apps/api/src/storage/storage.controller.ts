import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  upload(@Body() body: { dataUrl: string; prefix?: string }) {
    return this.storage.saveBase64Image(body.dataUrl, body.prefix ?? 'doc');
  }

  @Get('file')
  getFile(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = this.storage.readSignedFile(key, exp, sig);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(buffer);
  }
}
