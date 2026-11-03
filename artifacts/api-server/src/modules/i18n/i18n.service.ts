import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Not } from 'typeorm';
import { Language } from './entities/language.entity';
import { Translation } from './entities/translation.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Injectable()
export class I18nService {
  constructor(
    @InjectRepository(Language) private readonly langRepo: Repository<Language>,
    @InjectRepository(Translation) private readonly transRepo: Repository<Translation>,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** All enabled languages (for the selector). */
  async getEnabledLanguages(): Promise<Language[]> {
    return this.langRepo.find({
      where: { isEnabled: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /** All languages (admin). */
  async getAllLanguages(): Promise<Language[]> {
    return this.langRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /**
   * Get one namespace of translations for a language.
   * Falls back key-by-key to English when a translation is missing.
   */
  async getNamespace(
    langCode: string,
    namespace: string,
  ): Promise<Record<string, string>> {
    const [targetRows, enRows] = await Promise.all([
      this.transRepo.find({ where: { languageCode: langCode, namespace } }),
      langCode === 'en'
        ? Promise.resolve([] as Translation[])
        : this.transRepo.find({ where: { languageCode: 'en', namespace } }),
    ]);

    const enMap: Record<string, string> = {};
    enRows.forEach((r) => { if (r.value) enMap[r.key] = r.value; });

    const result: Record<string, string> = { ...enMap };
    targetRows.forEach((r) => { if (r.value) result[r.key] = r.value; });
    return result;
  }

  /**
   * Get all namespaces for a language in one shot (reduces round-trips).
   */
  async getAllNamespaces(langCode: string): Promise<Record<string, Record<string, string>>> {
    const [targetRows, enRows] = await Promise.all([
      this.transRepo.find({ where: { languageCode: langCode } }),
      langCode === 'en'
        ? Promise.resolve([] as Translation[])
        : this.transRepo.find({ where: { languageCode: 'en' } }),
    ]);

    const enMap: Record<string, Record<string, string>> = {};
    enRows.forEach((r) => {
      if (r.value) {
        enMap[r.namespace] = enMap[r.namespace] || {};
        enMap[r.namespace][r.key] = r.value;
      }
    });

    const result: Record<string, Record<string, string>> = {};
    // seed with English fallbacks
    Object.entries(enMap).forEach(([ns, keys]) => {
      result[ns] = { ...keys };
    });
    // overlay target language
    targetRows.forEach((r) => {
      if (r.value) {
        result[r.namespace] = result[r.namespace] || {};
        result[r.namespace][r.key] = r.value;
      }
    });
    return result;
  }

  // ─── Admin: Languages ─────────────────────────────────────────────────────

  async createLanguage(dto: CreateLanguageDto): Promise<Language> {
    const lang = this.langRepo.create(dto);
    return this.langRepo.save(lang);
  }

  async updateLanguage(code: string, dto: Partial<CreateLanguageDto>): Promise<Language> {
    const lang = await this.langRepo.findOne({ where: { code } });
    if (!lang) throw new NotFoundException(`Language '${code}' not found`);
    if (dto.isDefault) {
      await this.langRepo.update({}, { isDefault: false });
    }
    Object.assign(lang, dto);
    return this.langRepo.save(lang);
  }

  async deleteLanguage(code: string): Promise<void> {
    if (code === 'en') throw new Error('Cannot delete the default English language');
    await this.transRepo.delete({ languageCode: code });
    await this.langRepo.delete(code);
  }

  async setDefaultLanguage(code: string): Promise<Language> {
    await this.langRepo.update({}, { isDefault: false });
    return this.updateLanguage(code, { isEnabled: true, isDefault: true });
  }

  // ─── Admin: Translations ──────────────────────────────────────────────────

  async searchTranslations(opts: {
    langCode?: string;
    namespace?: string;
    search?: string;
    missingOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { langCode, namespace, search, missingOnly, page = 1, limit = 50 } = opts;
    const qb = this.transRepo.createQueryBuilder('t');
    if (langCode) qb.andWhere('t.languageCode = :langCode', { langCode });
    if (namespace) qb.andWhere('t.namespace = :namespace', { namespace });
    if (search) qb.andWhere('(t.key ILIKE :s OR t.value ILIKE :s)', { s: `%${search}%` });
    if (missingOnly) qb.andWhere('(t.value IS NULL OR t.value = :empty)', { empty: '' });
    qb.orderBy('t.namespace', 'ASC').addOrderBy('t.key', 'ASC');
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async upsertTranslation(dto: UpdateTranslationDto): Promise<Translation> {
    let row = await this.transRepo.findOne({
      where: { languageCode: dto.languageCode, namespace: dto.namespace, key: dto.key },
    });
    if (!row) {
      row = this.transRepo.create({
        languageCode: dto.languageCode,
        namespace: dto.namespace,
        key: dto.key,
      });
    }
    row.value = dto.value ?? null;
    row.isAIGenerated = dto.isAIGenerated ?? false;
    return this.transRepo.save(row);
  }

  async bulkUpsert(
    langCode: string,
    data: Record<string, Record<string, string>>,
    isAIGenerated = false,
  ): Promise<number> {
    let count = 0;
    for (const [namespace, keys] of Object.entries(data)) {
      for (const [key, value] of Object.entries(keys)) {
        await this.upsertTranslation({ languageCode: langCode, namespace, key, value, isAIGenerated });
        count++;
      }
    }
    return count;
  }

  /** Export all translations for a language as a flat JSON object keyed by "namespace.key" */
  async exportLanguage(code: string): Promise<Record<string, string>> {
    const rows = await this.transRepo.find({ where: { languageCode: code } });
    const result: Record<string, string> = {};
    rows.forEach((r) => { result[`${r.namespace}.${r.key}`] = r.value ?? ''; });
    return result;
  }

  /** Import a flat JSON object keyed by "namespace.key" */
  async importLanguage(
    code: string,
    data: Record<string, string>,
    isAIGenerated = false,
  ): Promise<number> {
    let count = 0;
    for (const [nsKey, value] of Object.entries(data)) {
      const dot = nsKey.indexOf('.');
      if (dot < 1) continue;
      const namespace = nsKey.slice(0, dot);
      const key = nsKey.slice(dot + 1);
      await this.upsertTranslation({ languageCode: code, namespace, key, value, isAIGenerated });
      count++;
    }
    return count;
  }

  /** Get a list of all distinct namespaces. */
  async getNamespaceList(): Promise<string[]> {
    const rows = await this.transRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.namespace', 'namespace')
      .where('t.languageCode = :code', { code: 'en' })
      .orderBy('t.namespace')
      .getRawMany();
    return rows.map((r) => r.namespace);
  }

  /** Count missing translations per language (compared to English). */
  async getMissingCounts(): Promise<Array<{ code: string; total: number; translated: number; missing: number }>> {
    const languages = await this.getAllLanguages();
    const enCount = await this.transRepo.count({ where: { languageCode: 'en' } });
    const results = await Promise.all(
      languages
        .filter((l) => l.code !== 'en')
        .map(async (l) => {
          const translated = await this.transRepo.count({
            where: { languageCode: l.code, value: Not(IsNull()) },
          });
          return { code: l.code, total: enCount, translated, missing: enCount - translated };
        }),
    );
    results.unshift({ code: 'en', total: enCount, translated: enCount, missing: 0 });
    return results;
  }
}
