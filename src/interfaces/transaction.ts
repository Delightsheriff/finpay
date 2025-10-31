import { Currency, TransactionStatus, TransactionType } from '@prisma/client';

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
