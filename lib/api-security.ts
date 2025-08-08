/**
 * API Security and Validation utilities
 * Provides input validation, rate limiting, and security headers for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

// Default rate limits
const DEFAULT_RATE_LIMITS: { [key: string]: RateLimitConfig } = {
  '/api/agents/*': { requests: 10, windowMs: 60000 }, // 10 requests per minute for agent endpoints
  '/api/cars/*': { requests: 100, windowMs: 60000 }, // 100 requests per minute for car searches
  default: { requests: 50, windowMs: 60000 } // 50 requests per minute default
};

/**
 * Rate limiting middleware
 */
export function rateLimiter(request: NextRequest, customLimit?: RateLimitConfig): { allowed: boolean; remaining: number } {
  const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
  const pathname = request.nextUrl.pathname;
  
  // Find matching rate limit config
  let config = DEFAULT_RATE_LIMITS.default;
  for (const [pattern, limit] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (pathname.match(pattern.replace('*', '.*'))) {
      config = limit;
      break;
    }
  }
  
  if (customLimit) config = customLimit;
  
  const key = `${clientIp}:${pathname}`;
  const now = Date.now();
  
  // Clean up old entries
  for (const [storeKey, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(storeKey);
    }
  }
  
  let current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    current = { count: 1, resetTime: now + config.windowMs };
    rateLimitStore.set(key, current);
    return { allowed: true, remaining: config.requests - 1 };
  }
  
  current.count++;
  
  if (current.count > config.requests) {
    logger.warn('Rate limit exceeded', { clientIp, pathname, count: current.count }, 'api-security');
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: config.requests - current.count };
}

/**
 * Input validation schemas
 */
export const validators = {
  url: (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  
  nonEmptyString: (value: unknown): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  positiveInteger: (value: unknown): value is number => {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  },
  
  safeString: (value: unknown, maxLength = 1000): value is string => {
    if (typeof value !== 'string') return false;
    if (value.length > maxLength) return false;
    // Basic XSS prevention
    return !/<[^>]*>/.test(value);
  }
};

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, consider using a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: { [K in keyof T]: (value: unknown) => value is T[K] }
): { valid: true; data: T } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const data: Partial<T> = {};

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a valid object'] };
  }

  for (const [key, validator] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[key];
    if (!validator(value)) {
      errors.push(`Invalid or missing field: ${key}`);
    } else {
      (data as Record<string, unknown>)[key] = value;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: data as T };
}

/**
 * Create secure API response
 */
export function createSecureResponse(data: unknown, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return response;
}

/**
 * Create error response without sensitive information
 */
export function createErrorResponse(
  message: string, 
  status = 500, 
  code?: string,
  details?: Record<string, unknown>
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: Record<string, unknown> = {
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (code) errorResponse.code = code;
  
  // Only include details in development
  if (isDevelopment && details) {
    errorResponse.details = details;
  }
  
  return createSecureResponse(errorResponse, status);
}

/**
 * API route wrapper with security features
 */
export function withSecurity<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse,
  options: {
    rateLimit?: RateLimitConfig;
    requireValidation?: boolean;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Rate limiting
      const { allowed, remaining } = rateLimiter(request, options.rateLimit);
      if (!allowed) {
        return createErrorResponse('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Call the actual handler
      const response = await handler(request, ...args);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      
      return response;
    } catch (error) {
      logger.error('API route error', error instanceof Error ? error : new Error(String(error)), { 
        pathname: request.nextUrl.pathname 
      }, 'api-security');
      
      return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
    }
  };
}