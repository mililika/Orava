import { Module } from '@nestjs/common';

import { AccountController } from './account.controller.js';

/** The account and its transactions. Section 05 adds adding and deleting them. */
@Module({ controllers: [AccountController] })
export class TransactionsModule {}
