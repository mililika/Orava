import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@orava/contracts';

import { DbHealth } from '../db/db-health.js';

@Controller('health')
export class HealthController {
  constructor(private readonly dbHealth: DbHealth) {}

  /** 200 `{ ok: true }` when Postgres answers, 503 otherwise. */
  @Get()
  async check(): Promise<HealthResponse> {
    const db = await this.dbHealth.isUp();
    if (!db.up) {
      throw new ServiceUnavailableException('The database is unreachable.', { cause: db.error });
    }
    return { ok: true };
  }
}
