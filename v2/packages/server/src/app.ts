import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { SCHEMA_VERSION } from '@minicalen/shared';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '2.0.0-alpha.0', schemaVersion: SCHEMA_VERSION });
  });

  return app;
}
