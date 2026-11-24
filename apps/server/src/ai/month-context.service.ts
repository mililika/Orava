import { Injectable, NotFoundException } from '@nestjs/common';
import { monthRange, reportForMonth, signatureOf } from '@orava/core';

import { TransactionsRepository } from '../db/transactions.repository.js';
import type { User } from '../db/users.repository.js';
import { coachSystem } from './coach.js';

/** What the AI routes know about one of the user's months, built from the database. */
export interface MonthContext {
  /** Changes whenever a transaction up to the month's end changes: the overview cache key. */
  signature: string;
  /** The newest month in the data, still going on. */
  latest: boolean;
  /**
   * The system prompt: the coach persona plus the month's report. A function, so an overview
   * cache hit doesn't build the report.
   */
  system(): string;
}

@Injectable()
export class MonthContextService {
  constructor(private readonly transactions: TransactionsRepository) {}

  /** 404 for a month outside the user's data. */
  async load(user: User, month: string): Promise<MonthContext> {
    const { txs, balance } = await this.transactions.accountOf(user);
    const { first, last } = monthRange(txs);
    if (!txs.length || month < first || month > last) {
      throw new NotFoundException('There are no transactions in that month.');
    }
    return {
      signature: signatureOf(txs, month),
      latest: month === last,
      system: () => coachSystem(reportForMonth(txs, balance, month)),
    };
  }
}
