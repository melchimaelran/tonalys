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
