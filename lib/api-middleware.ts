/**
 * API Middleware Utilities for Agent Endpoints
 * Provides logging, CORS, and security utilities for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';

// CORS configuration
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Logger utility (simplified pino-like interface)
export const logger = {
  info: (message: string, data?: any, service?: string) => {
    console.log(JSON.stringify({
      level: 'info',
      time: new Date().toISOString(),
      msg: message,
      service,
      ...data
    }));
  },
  error: (message: string, error: Error, data?: any, service?: string) => {
    console.error(JSON.stringify({
      level: 'error',
      time: new Date().toISOString(),
      msg: message,
      service,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...data
    }));
  },
  warn: (message: string, data?: any, service?: string) => {
    console.warn(JSON.stringify({
      level: 'warn',
      time: new Date().toISOString(),
      msg: message,
      service,
      ...data
    }));
  }
};

// CORS helper for OPTIONS requests
export function handleCORS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// Add CORS headers to a response
export function addCORSHeaders(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Request validation helpers
export function validatePrompt(prompt: any): string | null {
  if (!prompt || typeof prompt !== 'string') {
    return 'prompt es requerido y debe ser un string';
  }
  if (prompt.length > 100000) { // 100KB limit
    return 'prompt demasiado largo (máximo 100KB)';
  }
  return null;
}

export function validateMessages(messages: any): string | null {
  if (!Array.isArray(messages)) {
    return 'messages debe ser un array';
  }
  if (messages.length === 0) {
    return 'messages no puede estar vacío';
  }
  
  for (const message of messages) {
    if (!message.role || !message.content) {
      return 'cada message debe tener role y content';
    }
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      return 'role debe ser user, assistant o system';
    }
  }
  return null;
}

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Create secure response with proper headers
export function createSecureResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status });
  
  // Add CORS headers
  addCORSHeaders(response);
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Create error response
export function createErrorResponse(message: string, status: number = 500, code?: string) {
  return createSecureResponse({
    error: message,
    code,
    timestamp: new Date().toISOString()
  }, status);
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number, resetTime: number }>();

export function checkRateLimit(clientId: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Extract client identifier from request
export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}