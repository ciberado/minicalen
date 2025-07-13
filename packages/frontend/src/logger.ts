// Simple browser-compatible logger interface that mimics Winston
interface LoggerInterface {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

// Define log levels
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class BrowserLogger implements LoggerInterface {
  private currentLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.currentLevel = import.meta.env.DEV ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevels[level] <= logLevels[this.currentLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// Create and export the logger instance
const logger = new BrowserLogger();

export default logger;
