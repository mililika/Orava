import { Injectable } from '@nestjs/common';

import { TransactionsRepository } from '../db/transactions.repository.js';

/**
 * What "today" is for a user. The challenge data ends in the past, so it's the date of the user's
 * newest seed transaction, which keeps new transactions in the month the app is showing. To switch
 * to the real date, return `realToday()` here.
 */
@Injectable()
export class TodayService {
  constructor(private readonly transactions: TransactionsRepository) {}

  async todayFor(userId: string): Promise<string> {
    return (await this.transactions.newestSeedDate(userId)) ?? realToday();
  }
}

/** Today's date in UTC, YYYY-MM-DD. */
function realToday(): string {
  return new Date().toISOString().slice(0, 10);
}
