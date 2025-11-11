import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Prisma, User, Wallet } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VirtualAccountService } from 'src/virtual-account/virtual-account.service';

const DEFAULT_CURRENCIES: Currency[] = [
  Currency.NGN,
  Currency.USD,
  Currency.GBP,
  Currency.EUR,
];

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly virtualAccountService: VirtualAccountService,
  ) {}

  async createUserWalletWithTransaction(
    user: User,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const wallet = await tx.wallet.create({
      data: {
        userId: user.id,
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

    const ngnBalance = wallet.balances.find((b) => b.currency === Currency.NGN);

    if (!ngnBalance) {
      throw new InternalServerErrorException('Failed to create NGN balance');
    }

    // Create virtual account - this will throw if it fails
    // The error will bubble up and trigger transaction rollback
    await this.virtualAccountService.createVirtualAccountWithTransaction(
      ngnBalance.id,
      user,
      tx,
    );

    return wallet;
  }

  async getUserWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        balances: {
          include: {
            virtualAccount: true,
          },
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

  /**
   * Legacy method for creating wallet outside transaction
   * Consider deprecating this in favor of transaction-based approach
   */
  async createUserWallet(userId: string): Promise<Wallet> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.createUserWalletWithTransaction(user, tx);
    });
  }
}
