import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TransactionChatListener } from './transaction-chat.listener';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), TransactionsModule],
  providers: [ChatService, TransactionChatListener],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
