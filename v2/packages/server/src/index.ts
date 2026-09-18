import pino from 'pino';
import { createApp } from './app';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const port = Number(process.env.PORT ?? 3001);

const app = createApp();

app.listen(port, () => {
  logger.info(`MiniCalen v2 server listening on http://localhost:${port}`);
});
