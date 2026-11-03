import { Controller, Get, Param, Query } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('i18n')
@Controller('v1/i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  /** List all enabled languages for the language selector. */
  @Get('languages')
  getLanguages() {
    return this.i18nService.getEnabledLanguages();
  }

  /**
   * Get all translations for a language in one payload.
   * Used by i18n.js on page load to populate the full translation cache.
   */
  @Get(':lang/all')
  getAllNamespaces(@Param('lang') lang: string) {
    return this.i18nService.getAllNamespaces(lang);
  }

  /** Get a single namespace — for lazy loading. */
  @Get(':lang/:namespace')
  getNamespace(@Param('lang') lang: string, @Param('namespace') namespace: string) {
    return this.i18nService.getNamespace(lang, namespace);
  }
}
