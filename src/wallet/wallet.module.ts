import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WalletService } from './wallet.service';
import { TransactionModule } from 'src/transaction/transaction.module';
import { VirtualAccountModule } from 'src/virtual-account/virtual-account.module';
import { WalletController } from './wallet.controller';

@Module({
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
  imports: [TransactionModule, VirtualAccountModule],
})
export class WalletModule {}
