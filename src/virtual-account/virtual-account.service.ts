import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { firstValueFrom, retry, timeout } from 'rxjs';
import { Currency, Prisma, User } from '@prisma/client';
import { ENV } from 'src/common/constants/env';
import { PrismaService } from 'src/prisma/prisma.service';

interface FlutterwaveVirtualAccountResponse {
  status: string;
  message: string;
  data: {
    id?: string | number;
    account_number: string;
    account_name?: string;
    bank_name: string;
    order_ref?: string;
    flw_ref?: string;
  };
}

@Injectable()
export class VirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);
  private readonly FLW_SECRET_KEY = ENV.FLUTTER.FLW_SECRET_KEY;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 15000;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async createVirtualAccountWithTransaction(
    balanceId: string,
    user: Partial<User>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const tx_ref = `v-acct-${user.id}-${Date.now()}`;

    const payload = {
      email: user.email,
      firstname: user.firstName,
      lastname: user.lastName,
      tx_ref,
      bvn: '12345678901', // TODO: Replace with actual BVN in production
      is_permanent: true,
      narration: 'Virtual Account Creation',
      currency: 'NGN',
    };

    try {
      // Make API call with retry logic and timeout
      const response = await firstValueFrom(
        this.httpService
          .post<FlutterwaveVirtualAccountResponse>(
            'https://api.flutterwave.com/v3/virtual-account-numbers',
            payload,
            {
              headers: {
                Authorization: `Bearer ${this.FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            timeout(this.TIMEOUT_MS),
            retry({
              count: this.MAX_RETRIES,
              delay: (error, retryCount) => {
                // Exponential backoff: 1s, 2s, 4s
                const delayMs = Math.pow(2, retryCount - 1) * 1000;
                this.logger.warn(
                  `Retry ${retryCount}/${this.MAX_RETRIES} for virtual account creation after ${delayMs}ms`,
                );
                return new Promise((resolve) => setTimeout(resolve, delayMs));
              },
            }),
          ),
      );

      // Validate response
      if (response.data?.status !== 'success' || !response.data?.data) {
        throw new Error(
          `Invalid response from Flutterwave: ${response.data?.message || 'Unknown error'}`,
        );
      }

      const data = response.data.data;

      // Validate required fields
      if (!data.account_number || !data.bank_name) {
        throw new Error('Missing required fields in Flutterwave response');
      }

      // Save virtual account details in the same transaction
      await tx.virtualAccount.create({
        data: {
          balanceId,
          accountNumber: data.account_number,
          accountName:
            data.account_name || `${user.firstName} ${user.lastName}`,
          bankName: data.bank_name,
          currency: Currency.NGN,
          provider: 'FLUTTERWAVE',
          providerAccountId: data.id?.toString() || data.account_number,
          providerReference: data.order_ref || data.flw_ref || tx_ref,
        },
      });

      this.logger.log(
        `Successfully created virtual account for user ${user.id}: ${data.account_number}`,
      );
    } catch (error) {
      // Log detailed error information
      this.logger.error(
        `Failed to create virtual account for user ${user.id}`,
        {
          error: error.message,
          response: error.response?.data,
          stack: error.stack,
        },
      );

      // Throw a user-friendly error that will trigger transaction rollback
      throw new InternalServerErrorException(
        'Failed to create virtual account. Please try again or contact support.',
      );
    }
  }

  /**
   * Legacy method - creates virtual account outside transaction
   * Consider deprecating this
   */
  async createVirtualAccount(
    balanceId: string,
    user: Partial<User>,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await this.createVirtualAccountWithTransaction(balanceId, user, tx);
    });
  }

  /**
   * Retrieves virtual account details
   */
  async getVirtualAccount(balanceId: string) {
    return this.prisma.virtualAccount.findUnique({
      where: { balanceId },
    });
  }

  /**
   * Lists all virtual accounts for a user
   */
  async getUserVirtualAccounts(userId: string) {
    return this.prisma.virtualAccount.findMany({
      where: {
        balance: {
          wallet: {
            userId,
          },
        },
      },
      include: {
        balance: {
          select: {
            currency: true,
            balance: true,
          },
        },
      },
    });
  }
}
