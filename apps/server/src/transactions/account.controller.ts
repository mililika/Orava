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
    return { username: user.username, ...(await this.transactions.accountOf(user)) };
  }
}
