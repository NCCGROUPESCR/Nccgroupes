import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { InitializePaymentResult, PaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaystackService implements PaymentProvider {
  private readonly logger = new Logger('PaystackService');

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('paystack.baseUrl')!;
  }

  private get secretKey(): string {
    return this.configService.get<string>('paystack.secretKey')!;
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' };
  }

  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    currency: string;
    reference: string;
    callbackUrl: string;
  }): Promise<InitializePaymentResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/transaction/initialize`,
          {
            email: params.email,
            amount: params.amountKobo,
            currency: params.currency,
            reference: params.reference,
            callback_url: params.callbackUrl,
          },
          { headers: this.authHeaders() },
        ),
      );
      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    } catch (err) {
      this.logger.error(`Paystack initialize failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Verifies the x-paystack-signature header — an HMAC SHA512 of the raw
   * request body keyed with the Paystack secret key. This MUST run against
   * the raw (unparsed) body; see main.ts for the raw-body wiring on the
   * webhook route.
   */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    return expected === signatureHeader;
  }

  async initiateTransfer(params: {
    amountKobo: number;
    currency: string;
    recipientCode: string;
    reason: string;
  }): Promise<{ transferCode: string }> {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/transfer`,
          {
            source: 'balance',
            amount: params.amountKobo,
            currency: params.currency,
            recipient: params.recipientCode,
            reason: params.reason,
          },
          { headers: this.authHeaders() },
        ),
      );
      return { transferCode: data.data.transfer_code };
    } catch (err) {
      this.logger.error(`Paystack transfer failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
