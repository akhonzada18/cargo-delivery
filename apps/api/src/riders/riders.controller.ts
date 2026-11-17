import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('riders')
export class RidersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('kyc')
  submitKyc(
    @Body()
    body: {
      userId: string;
      cnicNumber: string;
      licenseNumber: string;
      plateNumber: string;
      cnicFrontKey: string;
      selfieKey: string;
    },
  ) {
    return this.prisma.riderProfile.upsert({
      where: { userId: body.userId },
      update: { ...body, kycStatus: 'pending' },
      create: { ...body, vehicleType: 'motorbike', kycStatus: 'pending' },
    });
  }

  @Get('pending-kyc')
  listPending() {
    return this.prisma.riderProfile.findMany({
      where: { kycStatus: 'pending' },
      include: { user: true },
    });
  }

  @Patch(':userId/kyc-status')
  updateKycStatus(
    @Param('userId') userId: string,
    @Body('status') status: 'approved' | 'rejected',
  ) {
    return this.prisma.riderProfile.update({
      where: { userId },
      data: { kycStatus: status },
    });
  }
}
