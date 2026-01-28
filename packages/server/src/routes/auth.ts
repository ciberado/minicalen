import { Router } from 'express';
import { auth } from '../auth';
import { toNodeHandler } from 'better-auth/node';

const router = Router();

// Mount BetterAuth routes using Node handler
router.all('*', toNodeHandler(auth));

export default router;
