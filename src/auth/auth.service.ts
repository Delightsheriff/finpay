import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, JwtPayload, Token } from 'src/interfaces/auth';
import { UserService } from 'src/user/user.service';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(data: SignupDto) {
    const user = await this.userService.createUser(data);
    const payload = { userId: user.id, email: user.email };
    return {
      success: true,
      message:
        'Account created successfully. Please verify your email to continue.',
      payload,
    };
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );
    const { password: _, ...result } = user;
    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: result,
    };
  }

  private async generateTokens(userId: string, email: string): Promise<Token> {
    const payload = { userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET') as string,
        expiresIn: this.configService.get('JWT_EXPIRES_IN') as unknown as any,
      } as any),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') as string,
        expiresIn: this.configService.get(
          'JWT_REFRESH_EXPIRES_IN',
        ) as unknown as any,
      } as any),
    ]);

    // Store hashed refresh token
    await this.userService.updateRefreshToken(userId, refreshToken);

    return {
      user: { id: userId, email },
      accessToken,
      refreshToken,
    };
  }
}
