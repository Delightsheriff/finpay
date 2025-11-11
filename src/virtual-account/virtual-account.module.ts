import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { VirtualAccountService } from './virtual-account.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [VirtualAccountService, PrismaService],
  exports: [VirtualAccountService],
})
export class VirtualAccountModule {}
