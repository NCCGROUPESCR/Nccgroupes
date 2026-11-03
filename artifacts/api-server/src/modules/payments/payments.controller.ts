import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('v1/webhooks')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Paystack webhook. Requires the raw request body for HMAC signature
   * verification — see main.ts, which enables `rawBody: true` on the Nest
   * app so `request.rawBody` is available here untouched by JSON parsing.
   */
  @HttpCode(HttpStatus.OK)
  @Post('paystack')
  async paystackWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(request.rawBody as Buffer, signature);
  }
}
