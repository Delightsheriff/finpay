import {
  Currency,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

export interface GetUserTransactions {
  userId: string;
  filters?: {
    type?: TransactionType;
    currency?: Currency;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  };
}

// Data required to create a new transaction
export type CreateTransactionData = {
  userId: string;
  walletId: string;
  amount: Prisma.Decimal | number;
  currency: Currency;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  externalReference?: string;
  metadata?: Record<string, any>;
};

// Input type for creating a single transaction
export type SingleTransactionInput = CreateTransactionData & {
  status?: TransactionStatus; // Optional, defaults to COMPLETED
};

// Input type for creating a batch of transactions
export type BatchTransactionInput = {
  userId: string;
  transactions: CreateTransactionData[];
  batchDescription?: string; // Optional: "Converted NGN to USD"
};
