/**
 * Production-ready logging utility
 * Replaces console.log statements with proper structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  service?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  private formatLog(level: LogLevel, message: string, metadata?: Record<string, unknown>, service?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      service
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false;
    
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info');
    
    return logLevels.indexOf(level) >= logLevels.indexOf(currentLevel);
  }

  debug(message: string, metadata?: Record<string, unknown>, service?: string): void {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatLog('debug', message, metadata, service);
      if (this.isDevelopment) {
        console.log('🔍', message, metadata ? JSON.stringify(metadata, null, 2) : '');
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }
  }

  info(message: string, metadata?: Record<string, unknown>, service?: string): void {
    if (this.shouldLog('info')) {
      const logEntry = this.formatLog('info', message, metadata, service);
      if (this.isDevelopment) {
        console.log('ℹ️', message, metadata ? JSON.stringify(metadata, null, 2) : '');
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }
  }

  warn(message: string, metadata?: Record<string, unknown>, service?: string): void {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatLog('warn', message, metadata, service);
      if (this.isDevelopment) {
        console.warn('⚠️', message, metadata ? JSON.stringify(metadata, null, 2) : '');
      } else {
        console.warn(JSON.stringify(logEntry));
      }
    }
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>, service?: string): void {
    if (this.shouldLog('error')) {
      const logEntry = this.formatLog('error', message, {
        ...metadata,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      }, service);
      
      if (this.isDevelopment) {
        console.error('❌', message, error, metadata ? JSON.stringify(metadata, null, 2) : '');
      } else {
        console.error(JSON.stringify(logEntry));
      }
    }
  }
}

export const logger = new Logger();