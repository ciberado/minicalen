import { loadConfig } from './config';
import { createLogger } from './logger';
import { createDatabase, runMigrations } from './db';
import { createAuth } from './auth';
import { createApp } from './app';
import { createCollaborationServer } from './realtime/server';

const config = loadConfig();
const logger = createLogger(config);
const { db, sqlite } = createDatabase(config.databaseUrl);

runMigrations(db);

const auth = createAuth(db, config);
const app = createApp({ db, auth, config, logger });
const httpServer = app.listen(config.port, config.host, () => {
  logger.info(`MiniCalen v2 API listening on http://${config.host}:${config.port}`);
});

const collaboration = createCollaborationServer({ db, auth, config, logger });
collaboration
  .listen()
  .then(() => logger.info(`Collaboration server listening on ws://localhost:${config.collabPort}`))
  .catch((error: unknown) => {
    logger.error({ error }, 'failed to start collaboration server');
    process.exit(1);
  });

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down`);

  collaboration.hocuspocus.flushPendingStores();
  await collaboration.destroy();
  httpServer.close();
  sqlite.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
