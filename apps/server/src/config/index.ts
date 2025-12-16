import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // AI Providers
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Rate Limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Feature Flags
  enableAuth: process.env.ENABLE_AUTH !== 'false',
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
};

export type Config = typeof config;
