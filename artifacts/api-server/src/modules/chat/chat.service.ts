import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, ChatMessageType } from './entities/chat-message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

export const CHAT_EVENTS = { MESSAGE_CREATED: 'chat.message_created' } as const;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private readonly messagesRepo: Repository<ChatMessage>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(transactionId: string): Promise<ChatMessage[]> {
    return this.messagesRepo.find({ where: { transactionId }, order: { createdAt: 'ASC' } });
  }

  async postMessage(
    transactionId: string,
    senderId: string | null,
    dto: CreateMessageDto,
  ): Promise<ChatMessage> {
    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        transactionId,
        senderId,
        type: dto.type ?? ChatMessageType.TEXT,
        body: dto.body,
        attachmentUrl: dto.attachmentUrl ?? null,
      }),
    );
    this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_CREATED, message);
    return message;
  }

  /** Used by other modules (state machine, disputes) to post an unsigned system message. */
  async postSystemMessage(transactionId: string, text: string): Promise<ChatMessage> {
    return this.postMessage(transactionId, null, { body: text, type: ChatMessageType.SYSTEM });
  }
}
