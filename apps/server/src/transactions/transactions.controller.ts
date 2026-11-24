import {
  Body,
  ConflictException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  CreateTransactionRequest,
  type CreateTransactionResponse,
  TransactionIdParam,
} from '@orava/contracts';
import { typeFor } from '@orava/core';

import { CurrentUser } from '../auth/decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { TransactionsRepository } from '../db/transactions.repository.js';
import type { User } from '../db/users.repository.js';
import { TodayService } from './today.service.js';

/** Most transactions one user may add in the app, so one account can't fill the database. */
const MAX_USER_TRANSACTIONS = 500;

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactions: TransactionsRepository,
    private readonly today: TodayService,
  ) {}

  /** Adds a transaction dated the user's "today", typed from its category. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateTransactionRequest)) body: CreateTransactionRequest,
  ): Promise<CreateTransactionResponse> {
    const tx = await this.transactions.addWithinLimit(
      user.id,
      {
        date: await this.today.todayFor(user.id),
        category: body.category,
        type: typeFor(body.category),
        merchant: body.merchant,
        amount: body.amount,
      },
      MAX_USER_TRANSACTIONS,
    );
    if (!tx) {
      throw new ConflictException(
        `You can add at most ${MAX_USER_TRANSACTIONS} transactions to this account.`,
      );
    }
    return { tx };
  }

  /** Soft-deletes one of the user's transactions. 404 for anyone else's. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(TransactionIdParam)) { id }: TransactionIdParam,
  ): Promise<void> {
    if (!(await this.transactions.softDelete(user.id, id))) {
      throw new NotFoundException('That transaction doesn’t exist.');
    }
  }
}
