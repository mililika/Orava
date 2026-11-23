import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { AppConfig } from '../config/app-config.js';
import { DB, type Db } from './db.js';
import { DbHealth } from './db-health.js';
import * as schema from './schema.js';
import { TransactionsRepository } from './transactions.repository.js';
import { UsersRepository } from './users.repository.js';

/** The one connection pool to Postgres (Supabase, session pooler) and Drizzle on top of it. */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Db => {
        const client = postgres(config.get('DATABASE_URL'), {
          // Supabase's free tier limits connections; one server instance needs only a few.
          max: 5,
          ssl: 'require',
          idle_timeout: 30,
          connect_timeout: 10,
        });
        return drizzle({ client, schema });
      },
    },
    DbHealth,
    UsersRepository,
    TransactionsRepository,
  ],
  // Not DB itself: outside src/db/, code goes through repositories, never Drizzle.
  exports: [DbHealth, UsersRepository, TransactionsRepository],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.$client.end({ timeout: 5 });
    this.logger.log('Database pool closed');
  }
}
