import { Controller, Get } from '@nestjs/common';
import type { AccountResponse } from '@orava/contracts';

import { CurrentUser } from '../auth/decorators.js';
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
      this.transactions.balanceOf(user),
    ]);
    return { username: user.username, balance, txs };
  }
}
