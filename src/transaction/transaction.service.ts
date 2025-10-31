import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  BatchTransactionInput,
  GetUserTransactions,
  SingleTransactionInput,
} from 'src/interfaces/transaction';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate unique transaction reference
   */
  private generateReference(): string {
    return `TXN-${randomUUID()}`;
  }

  /**
   * Generate unique batch ID for linked transactions
   */
  private generateBatchId(): string {
    return `BATCH-${randomUUID()}`;
  }

  async getUserTransactions(data: GetUserTransactions) {
    const { userId, filters } = data;

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.currency && { currency: filters.currency }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate || filters?.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };
    return await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionByReference(reference: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionsByBatchId(batchId: string): Promise<Transaction[]> {
    return await this.prisma.transaction.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTransaction(input: SingleTransactionInput) {
    const reference = this.generateReference();

    const data: Prisma.TransactionCreateInput = {
      user: {
        connect: { id: input.userId },
      },
      wallet: {
        connect: { id: input.walletId },
      },
      amount: new Prisma.Decimal(input.amount.toString()),
      currency: input.currency,
      type: input.type,
      status: input.status || TransactionStatus.COMPLETED,
      reference,
      description: input.description,
      externalReference: input.externalReference,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    };

    return await this.prisma.transaction.create({
      data,
    });
  }

  async createBatchTransactions(
    input: BatchTransactionInput,
  ): Promise<Transaction[]> {
    if (input.transactions.length === 0) {
      throw new BadRequestException(
        'Batch must contain at least one transaction',
      );
    }

    const batchId = this.generateBatchId();
    const userId = input.userId;

    // Ensure all transactions belong to same user
    const invalidTransaction = input.transactions.find(
      (txn) => txn.userId !== userId,
    );

    if (invalidTransaction) {
      throw new BadRequestException(
        'All transactions in batch must belong to same user',
      );
    }

    // Create all transactions in a database transaction (atomic)
    return await this.prisma.$transaction(
      input.transactions.map((txn) => {
        const reference = this.generateReference();
        const description = input.batchDescription
          ? `${input.batchDescription} - ${txn.description || ''}`.trim()
          : txn.description;

        // Prepare data with proper typing
        const data: Prisma.TransactionCreateInput = {
          user: {
            connect: { id: txn.userId },
          },
          wallet: {
            connect: { id: txn.walletId },
          },
          amount: new Prisma.Decimal(txn.amount.toString()),
          currency: txn.currency,
          type: txn.type,
          status: TransactionStatus.COMPLETED,
          reference,
          batchId,
          description,
          externalReference: txn.externalReference,
          metadata: txn.metadata
            ? (txn.metadata as Prisma.InputJsonValue)
            : undefined,
        };

        return this.prisma.transaction.create({
          data,
        });
      }),
    );
  }

  async getTransactionSummary(
    userId: string,
    filters?: {
      // <-- Changed to an object
      currency?: Currency;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<
    {
      currency: Currency;
      totalIncome: Prisma.Decimal;
      totalExpenses: Prisma.Decimal;
      netAmount: Prisma.Decimal;
    }[]
  > {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.COMPLETED,
        ...(filters?.currency && { currency: filters.currency }),
        // --- THIS IS THE NEW PART ---
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      select: {
        amount: true,
        currency: true,
      },
    });
    // Group by currency
    const summary = transactions.reduce(
      (acc, txn) => {
        const curr = txn.currency;

        if (!acc[curr]) {
          acc[curr] = {
            currency: curr,
            totalIncome: new Prisma.Decimal(0),
            totalExpenses: new Prisma.Decimal(0),
            netAmount: new Prisma.Decimal(0),
          };
        }

        const amount = new Prisma.Decimal(txn.amount.toString());

        if (amount.greaterThan(0)) {
          acc[curr].totalIncome = acc[curr].totalIncome.plus(amount);
        } else {
          acc[curr].totalExpenses = acc[curr].totalExpenses.plus(amount.abs());
        }

        acc[curr].netAmount = acc[curr].netAmount.plus(amount);

        return acc;
      },
      {} as Record<Currency, any>,
    );

    return Object.values(summary);
  }
}
