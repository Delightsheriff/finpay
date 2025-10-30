import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, Wallet } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const DEFAULT_CURRENCIES: Currency[] = [
  Currency.NGN,
  Currency.USD,
  Currency.GBP,
  Currency.EUR,
];

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserWallet(userId: string): Promise<Wallet> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.wallet.create({
      data: {
        userId,
        balances: {
          create: DEFAULT_CURRENCIES.map((currency) => ({
            currency,
            balance: 0,
          })),
        },
      },
      include: {
        balances: true,
      },
    });
  }

  async getUserWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        balances: {
          orderBy: { currency: 'asc' },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getBalance(userId: string, currency: Currency) {
    const balance = await this.prisma.balance.findFirst({
      where: {
        wallet: { userId },
        currency,
      },
    });

    return balance?.balance ?? 0;
  }

  async getBalances(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        balances: {
          orderBy: { currency: 'asc' },
        },
      },
    });

    return wallet?.balances || [];
  }
}
