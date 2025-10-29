import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, Wallet, WalletStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const DEFAULT_CURRENCIES: Currency[] = ['NGN', 'USD', 'GBP', 'EUR'];

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserWallets(userId: string): Promise<Wallet[]> {
    // Fetch user and verify existence
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accountName = this.buildAccountName(user);

    // Create all wallets in one transaction
    return this.prisma.$transaction(
      DEFAULT_CURRENCIES.map((currency) =>
        this.prisma.wallet.create({
          data: {
            userId,
            currency,
            accountNumber: this.generateAccountNumber(userId, currency),
            accountName,
            balance: 0,
            walletStatus: WalletStatus.ACTIVE,
          },
        }),
      ),
    );
  }

  private buildAccountName(user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`.toUpperCase();
    }
    return user.email.split('@')[0].toUpperCase();
  }

  private generateAccountNumber(userId: string, currency: Currency): string {
    const currencyCode = this.getCurrencyCode(currency);
    const userIdPart = userId.slice(0, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);

    return `${currencyCode}${userIdPart}${timestamp}`;
  }

  private getCurrencyCode(currency: Currency): string {
    const codes: Record<Currency, string> = {
      NGN: '56',
      USD: '84',
      GBP: '82',
      EUR: '97',
    };
    return codes[currency];
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { currency: 'asc' },
    });
  }
}
