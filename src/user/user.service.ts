import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async createUser(data: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      // Use interactive transaction to ensure atomicity
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Create user
          const user = await tx.user.create({
            data: {
              ...data,
              password: hashedPassword,
            },
          });

          await this.walletService.createUserWalletWithTransaction(user, tx);

          return user;
        },
        {
          maxWait: 10000, // 10 seconds max wait time
          timeout: 30000, // 30 seconds timeout
        },
      );

      const { password: _, ...userWithoutPassword } = result;
      return userWithoutPassword;
    } catch (error) {
      // Log the error for debugging
      console.error('Error creating user with wallet:', error);

      // Re-throw specific errors
      if (error instanceof ConflictException) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        'Failed to create user account. Please try again.',
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }
}
