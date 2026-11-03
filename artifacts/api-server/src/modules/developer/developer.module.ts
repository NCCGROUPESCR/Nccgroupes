import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { Webhook } from './entities/webhook.entity';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, Webhook])],
  providers: [DeveloperService],
  controllers: [DeveloperController],
})
export class DeveloperModule {}
