import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WalletService } from './wallet.service';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [PrismaModule, TransactionModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
