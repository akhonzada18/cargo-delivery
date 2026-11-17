import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('terminals')
export class TerminalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.cargoTerminal.findMany({ orderBy: { name: 'asc' } });
  }

  @Post()
  create(
    @Body() body: { name: string; city: string; address: string; lat: number; lng: number },
  ) {
    return this.prisma.cargoTerminal.create({ data: body });
  }
}
