import * as Joi from 'joi';

const schema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  AUTH_PASSWORD_HASH: Joi.string().required(),
  MINIO_ENDPOINT: Joi.string().required(),
  MINIO_PORT: Joi.string().required(),
  MINIO_ROOT_USER: Joi.string().required(),
  MINIO_ROOT_PASSWORD: Joi.string().required(),
  MINIO_BUCKET: Joi.string().required(),
  RABBITMQ_URL: Joi.string().uri().required(),
  WORKER_URL: Joi.string().uri().required(),
  // Set to "false" to open every route with no login (temporary public
  // access). Default "true" keeps auth exactly as it is.
  AUTH_ENABLED: Joi.string().valid('true', 'false').default('true'),
  // Non-demo tracks older than this are deleted (DB + MinIO) by the daily
  // cleanup cron (ADR-055).
  TRACK_RETENTION_HOURS: Joi.number().integer().min(1).default(24),
})
  .unknown(true)
  .required();

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result: Joi.ValidationResult<Record<string, unknown>> = schema.validate(
    config,
    { abortEarly: false },
  );

  if (result.error) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }

  return result.value;
}
