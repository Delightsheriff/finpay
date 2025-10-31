import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Currency,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { GetUserTransactions } from 'src/interfaces/transaction';
import { PrismaService } from 'src/prisma/prisma.service';

export type CreateTransactionData = {
  userId: string;
  walletId: string;
  amount: Prisma.Decimal;
  currency: Currency;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  externalReference?: string;
  reference: string;
  batchId?: string;
};

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getTransactionById(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionByReference(reference: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async createTransaction(data: CreateTransactionData) {
    return await this.prisma.transaction.create({
      data,
    });
  }
}
