import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('otp/request')
  async requestOtp(@Body('phone') phone: string) {
    // Integrate local SMS gateway (e.g., Twilio / Jazz / Telenor SMS API) in production
    return { phone, sent: true, devOtpHint: '1234' };
  }

  @Post('otp/verify')
  async verifyOtp(
    @Body() body: { phone: string; name?: string; role?: 'customer' | 'rider' },
  ) {
    const user = await this.prisma.user.upsert({
      where: { phone: body.phone },
      update: { isVerified: true },
      create: {
        phone: body.phone,
        name: body.name ?? 'Local User',
        role: body.role ?? 'customer',
        isVerified: true,
      },
    });
    return { user };
  }
}
