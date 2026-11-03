import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { I18nService } from './i18n.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@ApiTags('i18n-admin')
@Controller('v1/admin/i18n')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class I18nAdminController {
  constructor(private readonly i18nService: I18nService) {}

  // ─── Languages ────────────────────────────────────────────────────────────

  @Get('languages')
  getAllLanguages() {
    return this.i18nService.getAllLanguages();
  }

  @Post('languages')
  createLanguage(@Body() dto: CreateLanguageDto) {
    return this.i18nService.createLanguage(dto);
  }

  @Patch('languages/:code')
  updateLanguage(@Param('code') code: string, @Body() dto: Partial<CreateLanguageDto>) {
    return this.i18nService.updateLanguage(code, dto);
  }

  @Delete('languages/:code')
  deleteLanguage(@Param('code') code: string) {
    return this.i18nService.deleteLanguage(code);
  }

  @Post('languages/:code/set-default')
  setDefault(@Param('code') code: string) {
    return this.i18nService.setDefaultLanguage(code);
  }

  // ─── Missing / stats ──────────────────────────────────────────────────────

  @Get('missing')
  getMissingCounts() {
    return this.i18nService.getMissingCounts();
  }

  @Get('namespaces')
  getNamespaces() {
    return this.i18nService.getNamespaceList();
  }

  // ─── Translations ─────────────────────────────────────────────────────────

  @Get('translations')
  searchTranslations(
    @Query('lang') langCode?: string,
    @Query('ns') namespace?: string,
    @Query('q') search?: string,
    @Query('missing') missingOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.i18nService.searchTranslations({
      langCode,
      namespace,
      search,
      missingOnly: missingOnly === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post('translations')
  upsertTranslation(@Body() dto: UpdateTranslationDto) {
    return this.i18nService.upsertTranslation(dto);
  }

  /** Bulk-import a flat JSON keyed by "namespace.key" */
  @Post('translations/import/:code')
  importLanguage(
    @Param('code') code: string,
    @Body() data: Record<string, string>,
  ) {
    return this.i18nService.importLanguage(code, data);
  }

  /** Export all translations for a language as flat JSON */
  @Get('translations/export/:code')
  async exportLanguage(@Param('code') code: string, @Res() res: Response) {
    const data = await this.i18nService.exportLanguage(code);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${code}-translations.json"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
