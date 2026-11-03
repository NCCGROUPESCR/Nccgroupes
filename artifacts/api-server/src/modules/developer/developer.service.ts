import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { Webhook } from './entities/webhook.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(ApiKey) private readonly apiKeysRepo: Repository<ApiKey>,
    @InjectRepository(Webhook) private readonly webhooksRepo: Repository<Webhook>,
  ) {}

  async createApiKey(developerId: string, dto: CreateApiKeyDto): Promise<{ key: string; record: ApiKey }> {
    const prefix = dto.environment === 'live' ? 'sk_live_' : 'sk_test_';
    const secret = randomBytes(24).toString('hex');
    const rawKey = `${prefix}${secret}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const record = await this.apiKeysRepo.save(
      this.apiKeysRepo.create({
        developerId,
        label: dto.label,
        environment: dto.environment,
        keyHash,
        keyPrefix: rawKey.slice(0, 12),
      }),
    );

    // The raw key is only ever returned once, at creation time — only the
    // hash and a display prefix are persisted.
    return { key: rawKey, record };
  }

  async listApiKeys(developerId: string): Promise<ApiKey[]> {
    return this.apiKeysRepo.find({ where: { developerId }, order: { createdAt: 'DESC' } });
  }

  async revokeApiKey(developerId: string, keyId: string): Promise<void> {
    const key = await this.apiKeysRepo.findOne({ where: { id: keyId } });
    if (!key) throw new NotFoundException('API key not found.');
    if (key.developerId !== developerId) throw new ForbiddenException('Not your API key.');
    key.revokedAt = new Date();
    await this.apiKeysRepo.save(key);
  }

  async createWebhook(developerId: string, dto: CreateWebhookDto): Promise<Webhook> {
    const secret = randomBytes(20).toString('hex');
    return this.webhooksRepo.save(
      this.webhooksRepo.create({ developerId, url: dto.url, events: dto.events, secret }),
    );
  }

  async listWebhooks(developerId: string): Promise<Webhook[]> {
    return this.webhooksRepo.find({ where: { developerId }, order: { createdAt: 'DESC' } });
  }

  /** Placeholder usage metrics — production wires this to a request-logging table or an APM export. */
  async getUsage(developerId: string) {
    return {
      developerId,
      last30Days: { requests: 0, errors: 0, webhookDeliveries: 0 },
      note: 'Usage metering is not yet wired to live request logs in this build.',
    };
  }
}
