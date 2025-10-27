import { User } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

export interface Token {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}
