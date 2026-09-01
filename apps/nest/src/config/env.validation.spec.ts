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
  RABBITMQ_URL: 'amqp://tonalys:changeme@localhost:5672',
  WORKER_URL: 'http://localhost:8000',
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
    'RABBITMQ_URL',
    'WORKER_URL',
  ] as const)('throws when %s is missing', (key) => {
    const incompleteEnv = { ...validEnv, [key]: undefined };

    expect(() => validateEnv(incompleteEnv)).toThrow();
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow();
  });

  it('defaults AUTH_ENABLED to "true" when absent', () => {
    expect(validateEnv(validEnv)).toMatchObject({ AUTH_ENABLED: 'true' });
  });

  it('keeps AUTH_ENABLED="false" when provided', () => {
    expect(validateEnv({ ...validEnv, AUTH_ENABLED: 'false' })).toMatchObject({
      AUTH_ENABLED: 'false',
    });
  });

  it('throws when AUTH_ENABLED is neither "true" nor "false"', () => {
    expect(() => validateEnv({ ...validEnv, AUTH_ENABLED: 'yes' })).toThrow();
  });

  it('defaults TRACK_RETENTION_HOURS to 24 when absent', () => {
    expect(validateEnv(validEnv)).toMatchObject({ TRACK_RETENTION_HOURS: 24 });
  });

  it('coerces a provided TRACK_RETENTION_HOURS to a number', () => {
    expect(
      validateEnv({ ...validEnv, TRACK_RETENTION_HOURS: '48' }),
    ).toMatchObject({ TRACK_RETENTION_HOURS: 48 });
  });

  it('throws when TRACK_RETENTION_HOURS is not a positive integer', () => {
    expect(() =>
      validateEnv({ ...validEnv, TRACK_RETENTION_HOURS: '0' }),
    ).toThrow();
    expect(() =>
      validateEnv({ ...validEnv, TRACK_RETENTION_HOURS: 'soon' }),
    ).toThrow();
  });
});
