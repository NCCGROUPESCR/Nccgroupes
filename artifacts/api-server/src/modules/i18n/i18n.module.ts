import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from './entities/language.entity';
import { Translation } from './entities/translation.entity';
import { I18nService } from './i18n.service';
import { I18nController } from './i18n.controller';
import { I18nAdminController } from './i18n-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Language, Translation])],
  providers: [I18nService],
  controllers: [I18nController, I18nAdminController],
  exports: [I18nService],
})
export class I18nModule {}
