import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3100', 10),
  environment: process.env.APP_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  apiVersion: process.env.API_VERSION || '1.0.0',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
}));
