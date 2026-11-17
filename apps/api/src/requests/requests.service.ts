import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { calculateMotorbikeFare, SecureDocumentPayload } from '@cargo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface CreateRequestDto {
  customerId: string;
  terminalId: string;
  biltyNumber: string;
  biltyImageKey: string;
  idCardFrontKey: string;
  idCardBackKey: string;
  itemNotes?: string;
  isToPay: boolean;
  toPayAmount?: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateRequestDto) {
    const toPayAmount = dto.isToPay ? dto.toPayAmount ?? 0 : 0;
    const fare = calculateMotorbikeFare({
      distanceKm: dto.distanceKm,
      toPayAmount,
    });

    const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
    const initialStatus = dto.isToPay && toPayAmount > 0 ? 'pending_payment' : 'searching_rider';

    return this.prisma.deliveryRequest.create({
      data: {
        customerId: dto.customerId,
        terminalId: dto.terminalId,
        biltyNumber: dto.biltyNumber,
        biltyImageKey: dto.biltyImageKey,
        idCardFrontKey: dto.idCardFrontKey,
        idCardBackKey: dto.idCardBackKey,
        itemNotes: dto.itemNotes,
        isToPay: dto.isToPay,
        toPayAmount,
        toPayPrepaid: !dto.isToPay || toPayAmount === 0,
        deliveryFee: fare.baseFare + fare.distanceFare + fare.serviceFee,
        totalPayable: fare.totalPayable,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        deliveryOtp,
        status: initialStatus,
        events: {
          create: {
            actorId: dto.customerId,
            status: initialStatus,
            note: 'Cargo pickup request created',
          },
        },
      },
      include: { terminal: true },
    });
  }

  /** Called after customer completes To-Pay pre-payment in app/wallet. */
  async confirmToPayPrepayment(requestId: string, customerId: string) {
    const req = await this.prisma.deliveryRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.customerId !== customerId) throw new ForbiddenException();

    return this.prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        toPayPrepaid: true,
        status: 'searching_rider',
        events: {
          create: {
            actorId: customerId,
            status: 'searching_rider',
            note: 'To-Pay charges pre-paid; broadcasting to nearby motorbike riders',
          },
        },
      },
    });
  }

  async listAvailableForRiders() {
    return this.prisma.deliveryRequest.findMany({
      where: { status: 'searching_rider', toPayPrepaid: true },
      select: {
        id: true,
        terminal: true,
        dropoffAddress: true,
        deliveryFee: true,
        isToPay: true,
        toPayAmount: true,
        itemNotes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRequest(requestId: string, riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId: riderId } });
    if (!rider || rider.kycStatus !== 'approved') {
      throw new ForbiddenException('Rider KYC must be approved before accepting jobs');
    }

    const updated = await this.prisma.deliveryRequest.updateMany({
      where: { id: requestId, status: 'searching_rider', riderId: null },
      data: { riderId, status: 'accepted' },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Request is no longer available');
    }

    await this.prisma.requestEvent.create({
      data: {
        requestId,
        actorId: riderId,
        status: 'accepted',
        note: 'Rider accepted cargo pickup',
      },
    });

    return this.prisma.deliveryRequest.findUnique({
      where: { id: requestId },
      include: { terminal: true },
    });
  }

  async markAtTerminal(requestId: string, riderId: string) {
    const req = await this.assertAssignedRider(requestId, riderId);
    if (req.status !== 'accepted') {
      throw new BadRequestException('Invalid state transition');
    }

    return this.prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'at_terminal',
        events: {
          create: {
            actorId: riderId,
            status: 'at_terminal',
            note: 'Rider arrived at cargo terminal',
          },
        },
      },
    });
  }

  /**
   * Issues short-lived, watermarked document URLs ONLY while rider is at the terminal
   * and before pickup is confirmed. Every view is logged in DocumentAccessLog.
   */
  async getSecureDocuments(requestId: string, riderId: string): Promise<SecureDocumentPayload> {
    const req = await this.assertAssignedRider(requestId, riderId);
    if (req.status !== 'at_terminal') {
      throw new ForbiddenException(
        'Documents are only viewable when status is at_terminal and are revoked after pickup',
      );
    }

    const rider = await this.prisma.user.findUnique({ where: { id: riderId } });
    const bilty = this.storage.createSignedReadUrl(req.biltyImageKey);
    const idFront = this.storage.createSignedReadUrl(req.idCardFrontKey);
    const idBack = this.storage.createSignedReadUrl(req.idCardBackKey);

    await this.prisma.documentAccessLog.create({
      data: {
        requestId,
        riderId,
        expiresAt: new Date(bilty.expiresAt),
      },
    });

    return {
      requestId,
      biltyNumber: req.biltyNumber,
      biltyImageUrl: bilty.url,
      idCardFrontUrl: idFront.url,
      idCardBackUrl: idBack.url,
      watermarkText: `PICKUP ONLY • Order ${requestId.slice(-6)} • Rider: ${rider?.name ?? riderId} • ${new Date().toLocaleString()}`,
      expiresAt: bilty.expiresAt,
    };
  }

  async confirmPickup(requestId: string, riderId: string, pickupProofKey: string) {
    const req = await this.assertAssignedRider(requestId, riderId);
    if (req.status !== 'at_terminal') {
      throw new BadRequestException('Rider must be at terminal to confirm pickup');
    }

    return this.prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'picked_up',
        pickupProofKey,
        events: {
          create: {
            actorId: riderId,
            status: 'picked_up',
            photoKey: pickupProofKey,
            note: 'Cargo received from terminal; ID access revoked',
          },
        },
      },
    });
  }

  async completeDelivery(requestId: string, riderId: string, otp: string) {
    const req = await this.assertAssignedRider(requestId, riderId);
    if (req.status !== 'picked_up') {
      throw new BadRequestException('Cargo must be picked up before delivery');
    }
    if (req.deliveryOtp !== otp) {
      throw new BadRequestException('Invalid delivery OTP');
    }

    return this.prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'delivered',
        events: {
          create: {
            actorId: riderId,
            status: 'delivered',
            note: 'Delivered to customer with OTP verification',
          },
        },
      },
    });
  }

  private async assertAssignedRider(requestId: string, riderId: string) {
    const req = await this.prisma.deliveryRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.riderId !== riderId) throw new ForbiddenException('Not assigned to this rider');
    return req;
  }
}
