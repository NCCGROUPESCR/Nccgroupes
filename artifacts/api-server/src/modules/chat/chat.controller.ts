import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { ChatMessageType } from './entities/chat-message.entity';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/transactions/:transactionId/messages')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly transactionsService: TransactionsService,
  ) {}

  private async assertAccess(transactionId: string, user: User) {
    if ([UserRole.SUPPORT, UserRole.ADMIN].includes(user.role)) return;
    const txn = await this.transactionsService.findById(transactionId);
    const isParty = [txn.buyerId, txn.sellerId].includes(user.id);
    if (!isParty) throw new ForbiddenException('You are not a party to this transaction.');
  }

  @Get()
  async list(@Param('transactionId') transactionId: string, @CurrentUser() user: User) {
    await this.assertAccess(transactionId, user);
    return this.chatService.list(transactionId);
  }

  @Post()
  async post(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    await this.assertAccess(transactionId, user);
    return this.chatService.postMessage(transactionId, user.id, dto);
  }

  @ApiConsumes('multipart/form-data')
  @Post('attachment')
  @UseInterceptors(FileInterceptor('file'))
  async postAttachment(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: User,
    @UploadedFile() file: any,
  ) {
    await this.assertAccess(transactionId, user);
    // Placeholder: production code uploads `file.buffer` to S3 and uses the
    // resulting URL. The message type is inferred from the MIME type.
    const type = (file?.mimetype || '').startsWith('image/')
      ? ChatMessageType.IMAGE
      : (file?.mimetype || '').startsWith('video/')
        ? ChatMessageType.VIDEO
        : (file?.mimetype || '').startsWith('audio/')
          ? ChatMessageType.VOICE
          : ChatMessageType.DOCUMENT;

    return this.chatService.postMessage(transactionId, user.id, {
      body: file?.originalname ?? 'Attachment',
      type,
      attachmentUrl: `local://unstored/${file?.originalname ?? 'file'}`,
    });
  }
}
