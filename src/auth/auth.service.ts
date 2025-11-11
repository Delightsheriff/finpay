import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
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
    try {
      // This will now either fully succeed or fully rollback
      const user = await this.userService.createUser(data);

      return {
        success: true,
        message:
          'Account created successfully. Your wallet and virtual account are ready to use.',
        user: user.id,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof ConflictException) {
        throw error; // Re-throw conflict errors (email already exists)
      }

      // Log unexpected errors for debugging
      console.error('Signup error:', error);

      // Return user-friendly error message
      throw new InternalServerErrorException(
        'Unable to create account at this time. Please try again later or contact support if the issue persists.',
      );
    }
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

    try {
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
    } catch (error) {
      console.error('Token generation error:', error);
      throw new InternalServerErrorException(
        'Unable to complete login. Please try again.',
      );
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<Token> {
    const payload = { userId, email, role };

    try {
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
    } catch (error) {
      console.error('Error generating tokens:', error);
      throw new InternalServerErrorException(
        'Failed to generate authentication tokens',
      );
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.userService.updateRefreshToken(userId, null);
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error on logout failure - user intent is clear
    }
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

    try {
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user.id, user.email, user.role);

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        accessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new InternalServerErrorException('Failed to refresh tokens');
    }
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
