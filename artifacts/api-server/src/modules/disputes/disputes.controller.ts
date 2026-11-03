import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { DisputesService } from './disputes.service';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AddDisputeNoteDto } from './dto/add-dispute-note.dto';
import { DisputeStatus } from './entities/dispute.entity';

@ApiTags('disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  open(@CurrentUser() user: User, @Body() dto: OpenDisputeDto) {
    return this.disputesService.open(user.id, dto);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Get()
  findAll(@Query('status') status?: DisputeStatus) {
    return this.disputesService.findAll(status);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.disputesService.getNotes(id);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Post(':id/notes')
  addNote(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddDisputeNoteDto) {
    return this.disputesService.addNote(id, user.id, dto.body);
  }

  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Post(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, user.id, dto);
  }
}
