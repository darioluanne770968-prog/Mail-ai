import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error({
    msg: 'Request error',
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
  });

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.validation,
      },
    });
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  }

  // Handle authentication errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'Internal server error' : error.message,
    },
  });
}
