import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { DeveloperService } from './developer.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('developer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEVELOPER, UserRole.ADMIN)
@Controller('v1/developer')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post('api-keys')
  createApiKey(@CurrentUser() user: User, @Body() dto: CreateApiKeyDto) {
    return this.developerService.createApiKey(user.id, dto);
  }

  @Get('api-keys')
  listApiKeys(@CurrentUser() user: User) {
    return this.developerService.listApiKeys(user.id);
  }

  @Delete('api-keys/:id')
  revokeApiKey(@CurrentUser() user: User, @Param('id') id: string) {
    return this.developerService.revokeApiKey(user.id, id);
  }

  @Post('webhooks')
  createWebhook(@CurrentUser() user: User, @Body() dto: CreateWebhookDto) {
    return this.developerService.createWebhook(user.id, dto);
  }

  @Get('webhooks')
  listWebhooks(@CurrentUser() user: User) {
    return this.developerService.listWebhooks(user.id);
  }

  @Get('usage')
  getUsage(@CurrentUser() user: User) {
    return this.developerService.getUsage(user.id);
  }
}
