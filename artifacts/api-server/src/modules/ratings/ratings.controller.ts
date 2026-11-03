import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RatingsService } from './ratings.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller('v1')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.ratingsService.create(user.id, dto);
  }

  @Get('users/:id/reviews')
  findForUser(@Param('id') id: string) {
    return this.ratingsService.findForUser(id);
  }
}
