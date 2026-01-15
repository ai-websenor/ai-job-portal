import * as Joi from 'joi';

export const validationSchema = Joi.object({
  APPLICATION_SERVICE_PORT: Joi.number().default(3004),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
});
