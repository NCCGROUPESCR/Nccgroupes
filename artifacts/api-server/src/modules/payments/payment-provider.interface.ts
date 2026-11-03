export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentProvider {
  /** Starts a hosted checkout for funding an escrow transaction. */
  initializeTransaction(params: {
    email: string;
    amountKobo: number;
    currency: string;
    reference: string;
    callbackUrl: string;
  }): Promise<InitializePaymentResult>;

  /** Verifies an inbound webhook signature before its payload is trusted. */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean;

  /** Initiates a payout to a seller's bank account. */
  initiateTransfer(params: {
    amountKobo: number;
    currency: string;
    recipientCode: string;
    reason: string;
  }): Promise<{ transferCode: string }>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
