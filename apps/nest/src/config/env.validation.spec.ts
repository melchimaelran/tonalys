import { validateEnv } from './env.validation';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a-secret-that-is-long-enough',
  AUTH_PASSWORD_HASH: '$2b$10$somehashvalue',
};

describe('validateEnv', () => {
  it('returns the config unchanged when all required vars are present', () => {
    expect(validateEnv(validEnv)).toMatchObject(validEnv);
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'AUTH_PASSWORD_HASH'] as const)(
    'throws when %s is missing',
    (key) => {
      const incompleteEnv = { ...validEnv, [key]: undefined };

      expect(() => validateEnv(incompleteEnv)).toThrow();
    },
  );

  it('throws when JWT_SECRET is too short', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow();
  });
});
