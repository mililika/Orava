import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB, type Db } from './db.js';

/** Whether Postgres answers, for `GET /api/health`. Keeps Drizzle out of the controller. */
@Injectable()
export class DbHealth {
  constructor(@Inject(DB) private readonly db: Db) {}

  async isUp(): Promise<{ up: true } | { up: false; error: unknown }> {
    try {
      await this.db.execute(sql`select 1`);
      return { up: true };
    } catch (error) {
      return { up: false, error };
    }
  }
}
