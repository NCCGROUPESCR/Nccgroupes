import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { validate } from './config/env.validation';

import { HealthController } from './health/health.controller';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ChatModule } from './modules/chat/chat.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AdminModule } from './modules/admin/admin.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { ContentModule } from './modules/content/content.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { DirectoriesModule } from './modules/directories/directories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false, // migrations only — see src/database/migrations
        logging: config.get('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
    }),

    EventEmitterModule.forRoot(),

    CommonModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    TransactionsModule,
    ChatModule,
    DisputesModule,
    NotificationsModule,
    RatingsModule,
    AdminModule,
    DeveloperModule,
    WebsocketsModule,
    CurrenciesModule,
    ContentModule,
    PricingModule,
    I18nModule,
    DirectoriesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
