import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
  GetUser,
  type AuthenticatedUser,
} from 'src/auth/decorators/get-user.decorator';
import { Currency, TransactionStatus, TransactionType } from '@prisma/client';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async getUserTransactions(
    @GetUser() user: AuthenticatedUser,
    @Query('type') type?: TransactionType,
    @Query('currency') currency?: Currency,
    @Query('status') status?: TransactionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const transactions = await this.transactionService.getUserTransactions({
      userId: user.id,
      filters: {
        type,
        currency,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset,
      },
    });

    return {
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        total: transactions.length,
      },
    };
  }

  @Get('summary')
  async getTransactionSummary(
    @GetUser() user: AuthenticatedUser,
    @Query('currency') currency?: Currency,
  ) {
    const summary = await this.transactionService.getTransactionSummary(
      user.id,
      { currency },
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get('batch/:batchId')
  async getTransactionsByBatchId(@Param('batchId') batchId: string) {
    const transactions =
      await this.transactionService.getTransactionsByBatchId(batchId);

    return {
      success: true,
      data: transactions,
    };
  }

  @Get('reference/:reference')
  async getTransactionByReference(@Param('reference') reference: string) {
    const transaction =
      await this.transactionService.getTransactionByReference(reference);

    return {
      success: true,
      data: transaction,
    };
  }

  @Get(':id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.transactionService.getTransactionById(id);

    return {
      success: true,
      data: transaction,
    };
  }
}
