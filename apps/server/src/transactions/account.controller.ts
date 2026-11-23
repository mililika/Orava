import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import type { AccountResponse } from '@orava/contracts';

import { CurrentUser } from '../auth/decorators.js';
import { SIGN_IN_AGAIN } from '../auth/auth.guard.js';
import { TransactionsRepository } from '../db/transactions.repository.js';
import type { User } from '../db/users.repository.js';

@Controller('account')
export class AccountController {
  constructor(private readonly transactions: TransactionsRepository) {}

  /** The signed-in user's balance and transactions, newest first. */
  @Get()
  async get(@CurrentUser() user: User): Promise<AccountResponse> {
    const [txs, balance] = await Promise.all([
      this.transactions.list(user.id),
      this.transactions.balanceOf(user.id),
    ]);
    // Only if the user was deleted since AuthGuard loaded them.
    if (balance === undefined) throw new UnauthorizedException(SIGN_IN_AGAIN);
    return { username: user.username, balance, txs };
  }
}
