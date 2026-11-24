import { Module } from '@nestjs/common';

import { AccountController } from './account.controller.js';
import { TodayService } from './today.service.js';
import { TransactionsController } from './transactions.controller.js';

/** The account and its transactions: reading, adding and deleting them. */
@Module({ controllers: [AccountController, TransactionsController], providers: [TodayService] })
export class TransactionsModule {}
