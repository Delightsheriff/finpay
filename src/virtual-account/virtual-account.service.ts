import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Currency, Prisma, User } from '@prisma/client';
import { ENV } from 'src/common/constants/env';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);
  private readonly FLW_SECRET_KEY = ENV.FLUTTER.FLW_SECRET_KEY;
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async createVirtualAccountWithTransaction(
    balanceId: string,
    user: Partial<User>,
    tx: Prisma.TransactionClient,
  ) {
    const tx_ref = `v-acct-${user.id}-${Date.now()}`;

    const payload = {
      email: user.email,
      firstname: user.firstName,
      lastname: user.lastName,
      tx_ref,
      bvn: '12345678901', // testing purpose
      is_permanent: true,
      narration: 'Virtual Account Creation',
      currency: 'NGN',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.flutterwave.com/v3/virtual-account-numbers',
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.FLW_SECRET_KEY}`,
            },
          },
        ),
      );

      if (response.data?.status === 'success') {
        const data = response.data.data;
        await this.prisma.virtualAccount.create({
          data: {
            balanceId: balanceId,
            accountNumber: data.account_number,
            accountName: data.account_name || 'N/A',
            bankName: data.bank_name,
            currency: Currency.NGN,
            provider: 'FLUTTERWAVE',
            providerAccountId: data.id?.toString() || data.account_number,
            providerReference: data.order_ref || tx_ref,
          },
        });

        this.logger.log(`Created virtual account for user ${user.id}`);
      } else {
        throw new Error('Failed to create virtual account');
      }
    } catch (error) {
      this.logger.error(
        `Error creating virtual account for user ${user.id}`,
        error.response?.data || error.message,
      );
    }
  }
}
