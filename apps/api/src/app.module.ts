import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './prisma/prisma.service';
import { RequestsController } from './requests/requests.controller';
import { RequestsService } from './requests/requests.service';
import { RidersController } from './riders/riders.controller';
import { StorageController } from './storage/storage.controller';
import { StorageService } from './storage/storage.service';
import { TerminalsController } from './terminals/terminals.controller';

@Module({
  controllers: [
    AuthController,
    RequestsController,
    RidersController,
    StorageController,
    TerminalsController,
  ],
  providers: [PrismaService, StorageService, RequestsService],
})
export class AppModule {}
