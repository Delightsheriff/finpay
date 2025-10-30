import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  GetUser,
  type AuthenticatedUser,
} from 'src/auth/decorators/get-user.decorator';
import { Currency } from '@prisma/client';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balances')
  async getBalances(@GetUser() user: AuthenticatedUser) {
    const balances = await this.walletService.getBalances(user.id);
    return { success: true, data: balances };
  }

  @Get('balance/:currency')
  async getBalance(
    @GetUser() user: AuthenticatedUser,
    @Param('currency') currency: Currency,
  ) {
    const balance = await this.walletService.getBalance(user.id, currency);
    return { success: true, data: { currency, balance } };
  }

  @Get()
  async getWallet(@GetUser() user: AuthenticatedUser) {
    const wallet = await this.walletService.getUserWallet(user.id);
    return { success: true, data: wallet };
  }
}
