import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async validatePassword(password: string): Promise<boolean> {
    const hash = this.configService.get<string>('AUTH_PASSWORD_HASH');
    return bcrypt.compare(password, String(hash));
  }

  async login(password: string): Promise<{ access_token: string }> {
    const isValid = await this.validatePassword(password);
    if (!isValid) {
      throw new UnauthorizedException();
    }

    return { access_token: this.jwtService.sign({ sub: 'admin' }) };
  }
}
