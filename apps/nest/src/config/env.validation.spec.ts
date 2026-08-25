import { validateEnv } from './env.validation';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a-secret-that-is-long-enough',
  AUTH_PASSWORD_HASH: '$2b$10$somehashvalue',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: '9000',
  MINIO_ROOT_USER: 'tonalys',
  MINIO_ROOT_PASSWORD: 'changeme12345',
  MINIO_BUCKET: 'tonalys',
};

describe('validateEnv', () => {
  it('returns the config unchanged when all required vars are present', () => {
    expect(validateEnv(validEnv)).toMatchObject(validEnv);
  });

  it.each([
    'DATABASE_URL',
    'JWT_SECRET',
    'AUTH_PASSWORD_HASH',
    'MINIO_ENDPOINT',
    'MINIO_PORT',
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
    'MINIO_BUCKET',
  ] as const)('throws when %s is missing', (key) => {
    const incompleteEnv = { ...validEnv, [key]: undefined };

    expect(() => validateEnv(incompleteEnv)).toThrow();
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow();
  });
});
