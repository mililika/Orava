import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@orava/contracts';
import { sql } from 'drizzle-orm';

import { DB, type Db } from '../db/db.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 200 `{ ok: true }` when Postgres answers, 503 otherwise. */
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.db.execute(sql`select 1`);
    } catch (error) {
      throw new ServiceUnavailableException('The database is unreachable.', { cause: error });
    }
    return { ok: true };
  }
}
