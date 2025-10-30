import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, JwtPayload, Token } from 'src/interfaces/auth';
import { UserService } from 'src/user/user.service';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ENV } from 'src/common/constants/env';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(data: SignupDto) {
    const user = await this.userService.createUser(data);
    return {
      success: true,
      message:
        'Account created successfully. Please verify your email to continue.',
      user: user.id,
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
      user.role,
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

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<Token> {
    const payload = { userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: ENV.JWT_SECRET,
        expiresIn: ENV.JWT_EXPIRES_IN,
      }),
      this.jwtService.signAsync(payload, {
        secret: ENV.JWT_REFRESH_SECRET,
        expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
      }),
    ]);

    await this.userService.updateRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponse> {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Access Denied');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(user.id, user.email, user.role);
    return {
      success: true,
      message: 'Tokens refreshed successfully',
      accessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  async fetchUserProfile(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      success: true,
      message: 'User profile fetched successfully',
      user,
    };
  }
}
