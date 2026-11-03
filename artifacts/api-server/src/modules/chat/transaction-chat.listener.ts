import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatService } from './chat.service';
import { ChatMessageType } from './entities/chat-message.entity';
import {
  TRANSACTION_EVENTS,
  TransactionFundingProofSubmittedEvent,
  TransactionStatusChangedEvent,
} from '../transactions/events/transaction-events';
import { TransactionStatus } from '../transactions/entities/transaction.entity';

const MESSAGES: Partial<Record<TransactionStatus, string>> = {
  [TransactionStatus.SECURED]: 'Buyer funded escrow. Funds are held securely until the agreed conditions are confirmed.',
  [TransactionStatus.CONFIRMED]: 'Buyer confirmed the agreed conditions. Escrow is ready for release.',
  [TransactionStatus.DISPUTE]: 'Dispute opened. Escrow funds are frozen. Support will join this conversation shortly.',
  [TransactionStatus.RELEASED]: 'Escrow released to seller. Transaction complete.',
  [TransactionStatus.REFUNDED]: 'Escrow refunded in full to buyer.',
  [TransactionStatus.CANCELLED]: 'Transaction cancelled before funding.',
};

@Injectable()
export class TransactionChatListener {
  constructor(private readonly chatService: ChatService) {}

  @OnEvent(TRANSACTION_EVENTS.STATUS_CHANGED)
  async handleStatusChanged(event: TransactionStatusChangedEvent) {
    if (event.to === TransactionStatus.FUNDING_SUBMITTED) return;
    if (event.to === TransactionStatus.PENDING && event.from === TransactionStatus.FUNDING_SUBMITTED) {
      await this.chatService.postSystemMessage(
        event.transactionId,
        'Support rejected the proof of payment. Please re-check the transfer and resubmit.',
      );
      return;
    }
    const text = MESSAGES[event.to];
    if (text) {
      await this.chatService.postSystemMessage(event.transactionId, text);
    }
  }

  @OnEvent(TRANSACTION_EVENTS.FUNDING_PROOF_SUBMITTED)
  async handleFundingProofSubmitted(event: TransactionFundingProofSubmittedEvent) {
    await this.chatService.postMessage(event.transaction.id, null, {
      body: 'Buyer has funded the escrow account and uploaded proof of payment. Awaiting support verification.',
      type: ChatMessageType.SYSTEM,
      attachmentUrl: event.proofUrl,
    });
  }

}
