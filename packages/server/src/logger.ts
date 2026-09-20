import pino from 'pino';
import type { AppConfig } from './config';

export type AppLogger = ReturnType<typeof pino>;

export function createLogger(config: AppConfig): AppLogger {
  return pino({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
  });
}
