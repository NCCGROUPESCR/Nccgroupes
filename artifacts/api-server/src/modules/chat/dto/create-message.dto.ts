import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChatMessageType } from '../entities/chat-message.entity';

export class CreateMessageDto {
  @IsString()
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsEnum(ChatMessageType)
  type?: ChatMessageType;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
