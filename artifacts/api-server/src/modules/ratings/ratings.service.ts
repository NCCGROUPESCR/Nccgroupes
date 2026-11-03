import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionStatus } from '../transactions/entities/transaction.entity';
import { UsersService } from '../users/users.service';

const COMPLETED_STATUSES = [TransactionStatus.RELEASED, TransactionStatus.REFUNDED];

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  async create(raterId: string, dto: CreateReviewDto): Promise<Review> {
    const txn = await this.transactionsService.findById(dto.transactionId);
    if (!COMPLETED_STATUSES.includes(txn.status)) {
      throw new BadRequestException('You can only review a transaction after it has been settled.');
    }
    const parties = [txn.buyerId, txn.sellerId];
    if (!parties.includes(raterId) || !parties.includes(dto.rateeId) || raterId === dto.rateeId) {
      throw new ForbiddenException('You can only review other parties on your own transaction.');
    }

    const existing = await this.reviewsRepo.findOne({
      where: { transactionId: dto.transactionId, raterId, rateeId: dto.rateeId },
    });
    if (existing) throw new BadRequestException('You have already reviewed this party for this transaction.');

    const review = await this.reviewsRepo.save(
      this.reviewsRepo.create({
        transactionId: dto.transactionId,
        raterId,
        rateeId: dto.rateeId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );

    // Nudge trust score toward the new rating (simple moving signal, not a
    // full weighted-average model — good enough for v1).
    const delta = dto.rating >= 4 ? 1 : dto.rating <= 2 ? -2 : 0;
    if (delta !== 0) await this.usersService.adjustTrustScore(dto.rateeId, delta);

    return review;
  }

  async findForUser(userId: string): Promise<Review[]> {
    return this.reviewsRepo.find({ where: { rateeId: userId }, order: { createdAt: 'DESC' } });
  }
}
