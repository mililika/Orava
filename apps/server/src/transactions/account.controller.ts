import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import type { AccountResponse } from '@orava/contracts';

import { CurrentUser } from '../auth/decorators.js';
import type { SessionUser } from '../db/sessions.repository.js';
import { TransactionsRepository } from '../db/transactions.repository.js';

@Controller('account')
export class AccountController {
  constructor(private readonly transactions: TransactionsRepository) {}

  /** The signed-in user's balance and transactions, newest first. */
  @Get()
  async get(@CurrentUser() user: SessionUser): Promise<AccountResponse> {
    const [txs, balance] = await Promise.all([
      this.transactions.list(user.id),
      this.transactions.balanceOf(user.id),
    ]);
    // Only if the user was deleted since SessionGuard loaded them (sessions cascade with it).
    if (balance === undefined) throw new UnauthorizedException('Please sign in again.');
    return { username: user.username, balance, txs };
  }
}
