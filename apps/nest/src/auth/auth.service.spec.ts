import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let configService: ConfigService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);
  });

  describe('validatePassword', () => {
    it('returns true for the correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      jest.spyOn(configService, 'get').mockReturnValue(hash);

      await expect(service.validatePassword('correct-password')).resolves.toBe(
        true,
      );
    });

    it('returns false for an incorrect password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      jest.spyOn(configService, 'get').mockReturnValue(hash);

      await expect(service.validatePassword('wrong-password')).resolves.toBe(
        false,
      );
    });
  });

  describe('login', () => {
    it('returns a JWT for the correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      jest.spyOn(configService, 'get').mockReturnValue(hash);
      jest.spyOn(jwtService, 'sign').mockReturnValue('signed-jwt-token');

      const result = await service.login('correct-password');

      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('throws UnauthorizedException for an incorrect password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      jest.spyOn(configService, 'get').mockReturnValue(hash);

      await expect(service.login('wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
