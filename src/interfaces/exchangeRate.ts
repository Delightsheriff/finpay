import { Currency } from '@prisma/client';

export type ExchangeRate = {
  from: Currency;
  to: Currency;
  rate: number;
  markup: number;
  effectiveRate: number;
  timestamp: Date;
};

export type ConversionResult = {
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  markup: number;
};
