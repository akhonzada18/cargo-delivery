import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRequestDto, RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.requestsService.create(dto);
  }

  @Post(':id/confirm-topay')
  confirmToPay(@Param('id') id: string, @Body('customerId') customerId: string) {
    return this.requestsService.confirmToPayPrepayment(id, customerId);
  }

  @Get()
  listAll() {
    return this.requestsService.listAllForAdmin();
  }

  @Get('customer/:customerId')
  listForCustomer(@Param('customerId') customerId: string) {
    return this.requestsService.listForCustomer(customerId);
  }

  @Get('rider/:riderId')
  listForRider(@Param('riderId') riderId: string) {
    return this.requestsService.listForRider(riderId);
  }

  @Get('available')
  listAvailable() {
    return this.requestsService.listAvailableForRiders();
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Body('riderId') riderId: string) {
    return this.requestsService.acceptRequest(id, riderId);
  }

  @Post(':id/at-terminal')
  atTerminal(@Param('id') id: string, @Body('riderId') riderId: string) {
    return this.requestsService.markAtTerminal(id, riderId);
  }

  @Get(':id/secure-documents/:riderId')
  getSecureDocuments(@Param('id') id: string, @Param('riderId') riderId: string) {
    return this.requestsService.getSecureDocuments(id, riderId);
  }

  @Post(':id/pickup')
  confirmPickup(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Body('pickupProofKey') pickupProofKey: string,
  ) {
    return this.requestsService.confirmPickup(id, riderId, pickupProofKey);
  }

  @Post(':id/deliver')
  completeDelivery(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Body('otp') otp: string,
  ) {
    return this.requestsService.completeDelivery(id, riderId, otp);
  }
}
