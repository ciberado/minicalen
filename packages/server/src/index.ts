import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import logger from './logger.js';
import { auth } from './auth/index.js';
import { toNodeHandler } from 'better-auth/node';
import sessionsRoutes from './routes/sessions.js';
import migrateRoutes from './routes/migrate.js';
import { optionalAuthSocket } from './auth/middleware.js';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Dynamic CORS configuration based on environment
const getAllowedOrigins = (): string[] | boolean => {
  const origins: string[] = [];
  
  // Add custom origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()));
  }
  
  // Default development origins
  if (NODE_ENV === 'development') {
    origins.push('http://localhost:5173'); // Vite default
    origins.push('http://localhost:5174'); // Vite alternative port
    origins.push('http://localhost:3000'); // React default
    origins.push('http://127.0.0.1:5173');
    origins.push('http://127.0.0.1:5174');
    origins.push('http://127.0.0.1:3000');
  }
  
  // Add proxy host for production (Caddy proxy)
  if (process.env.MINICALEN_HOST) {
    const proxyHost = process.env.MINICALEN_HOST;
    origins.push(`https://${proxyHost}`);
    origins.push(`http://${proxyHost}`);
  }
  
  // For production, require explicit ALLOWED_ORIGINS or MINICALEN_HOST
  if (NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS && !process.env.MINICALEN_HOST) {
    logger.warn('No ALLOWED_ORIGINS or MINICALEN_HOST set for production environment');
  }
  
  return origins.length > 0 ? origins : true; // true allows all origins (development fallback)
};

// Create server (HTTP or HTTPS based on configuration)
let server;
if (USE_HTTPS) {
  try {
    const keyPath = process.env.SSL_KEY_PATH || 'key.pem';
    const certPath = process.env.SSL_CERT_PATH || 'cert.pem';
    
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      logger.error(`SSL files not found: ${keyPath} or ${certPath}`);
      logger.info('Generate SSL certificates with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
      process.exit(1);
    }
    
    server = createHttpsServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }, app);
  } catch (error) {
    logger.error('Failed to create HTTPS server:', error);
    process.exit(1);
  }
} else {
  server = createServer(app);
}

const allowedOrigins = getAllowedOrigins();

logger.info(`CORS configuration for ${NODE_ENV}:`, allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable CORS for all routes with dynamic configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse cookies for authentication
app.use(cookieParser());

// Authentication routes (BetterAuth) - must come before other routes
app.use('/api/auth', toNodeHandler(auth));

// API routes with authentication
app.use('/api/sessions', sessionsRoutes);
app.use('/api/migrate', migrateRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    https: USE_HTTPS,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Create data directory if it doesn't exist
const dataDir = join(dirname(__dirname), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create sessions directory if it doesn't exist
const sessionsDir = join(dataDir, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir);
}

// Helper function to check session access
async function checkSessionAccess(sessionId: string, userId: string, minAccessLevel: 'viewer' | 'editor' = 'viewer'): Promise<boolean> {
  try {
    const { db } = await import('./db/index.js');
    const { sessions, sessionPermissions } = await import('./db/schema/index.js');
    const { eq, and } = await import('drizzle-orm');
    
    // Check if user owns the session
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (session.length > 0 && session[0].userId === userId) {
      return true; // Owner has full access
    }
    
    // Check if session permissions exist for user
    const permission = await db.select().from(sessionPermissions)
      .where(and(
        eq(sessionPermissions.sessionId, sessionId),
        eq(sessionPermissions.userId, userId)
      ))
      .limit(1);
    
    if (permission.length > 0) {
      const accessLevel = permission[0].accessLevel;
      if (minAccessLevel === 'viewer') {
        return accessLevel === 'viewer' || accessLevel === 'editor' || accessLevel === 'owner';
      }
      return accessLevel === 'editor' || accessLevel === 'owner';
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking session access:', error);
    return false;
  }
}

// WebSocket connection handling
io.use(optionalAuthSocket);

io.on('connection', (socket) => {
  logger.debug('User connected:', socket.id);
  
  // Log if user is authenticated
  if ((socket as any).user) {
    logger.debug(`Authenticated user: ${(socket as any).user.email}`);
  }

  // Handle joining a session room
  socket.on('join-session', (sessionId: string) => {
    logger.debug(`User ${socket.id} joining session: ${sessionId}`);
    socket.join(sessionId);
    
    // Notify others in the room that a new user joined
    socket.to(sessionId).emit('user-joined', {
      userId: socket.id,
      user: (socket as any).user,
      message: `User ${socket.id} joined the session`
    });
    
    // Send confirmation to the user
    socket.emit('session-joined', {
      sessionId,
      message: `Successfully joined session ${sessionId}`
    });
  });

  // Handle leaving a session room
  socket.on('leave-session', (sessionId: string) => {
    logger.debug(`User ${socket.id} leaving session: ${sessionId}`);
    socket.leave(sessionId);
    
    // Notify others in the room that a user left
    socket.to(sessionId).emit('user-left', {
      userId: socket.id,
      message: `User ${socket.id} left the session`
    });
  });

  // Handle state changes (real-time synchronization)
  socket.on('state-change', async (data: { sessionId: string; state: unknown; fromUser: string }) => {
    logger.debug(`State change from user ${data.fromUser} in session ${data.sessionId}`);
    
    // Check if user has permission to edit this session
    const user = (socket as any).user;
    if (user) {
      // For authenticated users, verify they have edit access
      const hasAccess = await checkSessionAccess(data.sessionId, user.id, 'editor');
      if (!hasAccess) {
        logger.warn(`User ${user.email} attempted to modify session ${data.sessionId} without permission`);
        socket.emit('error', { message: 'You do not have permission to edit this session' });
        return;
      }
    }
    // Anonymous users can always edit their own sessions (no ownership yet)
    
    // Save the state change to the session file automatically
    const saved = saveSessionToFile(data.sessionId, data.state, 'WebSocket');
    
    if (!saved) {
      logger.error(`Failed to auto-save session ${data.sessionId} via WebSocket`);
    }
    
    // Broadcast the state change to all other users in the session (excluding sender)
    socket.to(data.sessionId).emit('state-update', {
      sessionId: data.sessionId,
      state: data.state,
      fromUser: data.fromUser
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.debug('User disconnected:', socket.id);
  });
});

// Define types for session data
interface SessionState {
  timestamp?: string;
  [key: string]: unknown;
}

interface Session {
  id: string;
  timestamp: string;
  state: SessionState;
}

// Helper function to get session file path (for legacy file-based sessions)
const getSessionFilePath = (id: string): string => {
  return join(sessionsDir, `${id}.json`);
};

// Helper function to save session (used by both WebSocket and API for legacy support)
const saveSessionToFile = (sessionId: string, sessionState: SessionState | unknown, source: string = 'API'): boolean => {
  try {
    // Ensure sessionState is treated as SessionState
    const state = sessionState as SessionState;
    // Ensure timestamp is present
    if (!state.timestamp) {
      state.timestamp = new Date().toISOString();
    }
    
    // Create the session object
    const session: Session = {
      id: sessionId,
      timestamp: state.timestamp,
      state: state
    };
    
    // Save to file (legacy support)
    const filePath = getSessionFilePath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    logger.info(`Session saved via ${source}: ${sessionId} at ${new Date(state.timestamp).toLocaleString()}`);
    
    return true;
  } catch (error) {
    logger.error(`Error saving session ${sessionId} via ${source}:`, error);
    return false;
  }
};

// Legacy API endpoint - kept for backward compatibility
// New sessions should use the authenticated /api/sessions routes
app.post('/api/legacy/sessions', (req: Request, res: Response): void => {
  const { id, state }: { id: string; state: SessionState } = req.body;
  
  if (!id || !state) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  // Save using the helper function
  const saved = saveSessionToFile(id, state, 'Legacy API');
  
  if (saved) {
    res.json({ id, timestamp: state.timestamp || new Date().toISOString() });
  } else {
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Legacy API endpoint - kept for backward compatibility
app.get('/api/legacy/sessions/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  
  try {
    const filePath = getSessionFilePath(id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const session = JSON.parse(data);
    
    logger.debug(`Legacy session loaded: ${id}`);
    res.json(session);
  } catch (error) {
    logger.error(`Error loading legacy session ${id}:`, error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Start the server
server.listen(PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  const wsProtocol = USE_HTTPS ? 'wss' : 'ws';
  
  logger.info(`Server running on port ${PORT} (${NODE_ENV} mode, ${protocol.toUpperCase()})`);
  logger.info(`WebSocket server ready for connections`);
  logger.info(`CORS origins:`, allowedOrigins);
  logger.info(`Data directory: ${dataDir}`);
  
  if (NODE_ENV === 'development') {
    logger.info(`Local API URL: ${protocol}://localhost:${PORT}/api`);
    logger.info(`Local WebSocket URL: ${wsProtocol}://localhost:${PORT}`);
  }
  
  if (USE_HTTPS) {
    logger.info(`HTTPS enabled with SSL certificates`);
  }
  
  if (NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    logger.warn('Consider setting ALLOWED_ORIGINS for better security in production');
  }
}).on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else if (error.code === 'ENOENT' && USE_HTTPS) {
    logger.error(`SSL certificate files not found. Please check SSL_KEY_PATH and SSL_CERT_PATH`);
  } else {
    logger.error(`Server failed to start:`, error.message);
  }
  process.exit(1);
});
