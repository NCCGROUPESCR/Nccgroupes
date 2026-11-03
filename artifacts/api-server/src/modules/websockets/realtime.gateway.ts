import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  TRANSACTION_EVENTS,
  TransactionCreatedEvent,
  TransactionFundingProofSubmittedEvent,
  TransactionStatusChangedEvent,
} from '../transactions/events/transaction-events';
import { CHAT_EVENTS } from '../chat/chat.service';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { TransactionsService } from '../transactions/transactions.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : '*' },
  path: '/realtime/socket.io',
})
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.join(`user:${payload.sub}`);
      if (payload.role === 'admin' || payload.role === 'support') {
        client.join('staff');
      }
    } catch {
      client.emit('error', 'Unauthorized');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join_transaction')
  async joinTransaction(@ConnectedSocket() client: Socket, @MessageBody() transactionId: string) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId) throw new UnauthorizedException();

    const txn = await this.transactionsService.findById(transactionId).catch(() => null);
    if (!txn) return;

    const isParty = [txn.buyerId, txn.sellerId].includes(userId);
    const isStaff = role === 'support' || role === 'admin';
    if (!isParty && !isStaff) {
      client.emit('error', 'Not authorized to join this transaction room.');
      return;
    }
    client.join(`transaction:${transactionId}`);
  }

  @OnEvent(CHAT_EVENTS.MESSAGE_CREATED)
  handleChatMessage(message: ChatMessage) {
    this.server?.to(`transaction:${message.transactionId}`).emit('chat.message', message);
  }

  @OnEvent(TRANSACTION_EVENTS.STATUS_CHANGED)
  handleStatusChanged(event: TransactionStatusChangedEvent) {
    this.server?.to(`transaction:${event.transactionId}`).emit('transaction.status_changed', event);
    if (event.to === 'dispute') {
      this.server?.to(`transaction:${event.transactionId}`).emit('dispute.opened', event);
    }
  }

  @OnEvent(TRANSACTION_EVENTS.CREATED)
  handleCreated(event: TransactionCreatedEvent) {
    const txn = event.transaction;
    this.server?.to(`user:${txn.sellerId}`).emit('transaction.created', txn);
    this.server?.to('staff').emit('transaction.created', txn);
  }

  @OnEvent(TRANSACTION_EVENTS.FUNDING_PROOF_SUBMITTED)
  handleFundingProofSubmitted(event: TransactionFundingProofSubmittedEvent) {
    const txn = event.transaction;
    this.server?.to(`transaction:${txn.id}`).emit('transaction.funding_proof_submitted', event);
    this.server?.to('staff').emit('transaction.funding_proof_submitted', event);
  }

}
