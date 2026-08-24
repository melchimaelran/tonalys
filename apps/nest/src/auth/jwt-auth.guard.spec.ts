import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
    getHandler: () => {},
    getClass: () => {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;
  let verifySpy: jest.Mock;

  beforeEach(() => {
    verifySpy = jest.fn();
    jwtService = { verify: verifySpy } as unknown as JwtService;
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    guard = new JwtAuthGuard(jwtService, reflector);
  });

  it('throws UnauthorizedException when no Authorization header is present', () => {
    const context = createContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the token is invalid', () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error('invalid token');
    });
    const context = createContext({ authorization: 'Bearer bad-token' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('returns true when the token is valid', () => {
    jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: 'admin' });
    const context = createContext({ authorization: 'Bearer good-token' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true without checking the token when the route is marked @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(verifySpy).not.toHaveBeenCalled();
  });
});
