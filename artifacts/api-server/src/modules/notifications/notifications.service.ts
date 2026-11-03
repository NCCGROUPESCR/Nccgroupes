import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TRANSACTION_EVENTS,
  TransactionFundingProofSubmittedEvent,
  TransactionStatusChangedEvent,
} from '../transactions/events/transaction-events';
import { CHAT_EVENTS } from '../chat/chat.service';
import { ChatMessage, ChatMessageType } from '../chat/entities/chat-message.entity';

export interface NotificationJob {
  userId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  async notify(job: NotificationJob): Promise<void> {
    this.logger.log(`[${job.channel}] -> user ${job.userId}: ${job.title} — ${job.body}`);
  }

  @OnEvent(TRANSACTION_EVENTS.STATUS_CHANGED)
  async onStatusChanged(event: TransactionStatusChangedEvent) {
    this.logger.log(`Transaction ${event.reference} moved ${event.from} -> ${event.to}`);
  }

  @OnEvent(CHAT_EVENTS.MESSAGE_CREATED)
  async onChatMessage(message: ChatMessage) {
    if (message.type === ChatMessageType.SYSTEM) return;
    this.logger.log(`New chat message on transaction ${message.transactionId}`);
  }

  @OnEvent(TRANSACTION_EVENTS.FUNDING_PROOF_SUBMITTED)
  async onFundingProofSubmitted(event: TransactionFundingProofSubmittedEvent) {
    this.logger.log(
      `Transaction ${event.transaction.reference}: buyer submitted proof of escrow funding, awaiting support review.`,
    );
  }

}
