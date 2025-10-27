import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from 'src/interfaces/auth';
import { UserService } from 'src/user/user.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
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
}
