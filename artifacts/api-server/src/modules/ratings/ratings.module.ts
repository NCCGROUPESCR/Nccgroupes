import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), TransactionsModule, UsersModule],
  providers: [RatingsService],
  controllers: [RatingsController],
})
export class RatingsModule {}
