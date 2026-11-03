import { Transaction, TransactionStatus } from '../entities/transaction.entity';

export const TRANSACTION_EVENTS = {
  CREATED: 'transaction.created',
  STATUS_CHANGED: 'transaction.status_changed',
  SYSTEM_MESSAGE: 'transaction.system_message',
  FUNDING_PROOF_SUBMITTED: 'transaction.funding_proof_submitted',
} as const;

export interface TransactionCreatedEvent {
  transaction: Transaction;
}

export interface TransactionStatusChangedEvent {
  transactionId: string;
  reference: string;
  from: TransactionStatus;
  to: TransactionStatus;
  actorId: string | null;
}

export interface TransactionSystemMessageEvent {
  transactionId: string;
  text: string;
}

export interface TransactionFundingProofSubmittedEvent {
  transaction: Transaction;
  proofUrl: string;
  uploadedBy: string;
}

