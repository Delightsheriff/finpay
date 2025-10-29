import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
  imports: [WalletModule],
})
export class UserModule {}
