import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ApiKeyEnvironment } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(60)
  label: string;

  @IsEnum(ApiKeyEnvironment)
  environment: ApiKeyEnvironment;
}
