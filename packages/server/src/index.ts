import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';

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
    origins.push('http://localhost:3000'); // React default
    origins.push('http://127.0.0.1:5173');
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
    console.warn('WARNING: No ALLOWED_ORIGINS or MINICALEN_HOST set for production environment');
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
      console.error(`❌ SSL files not found: ${keyPath} or ${certPath}`);
      console.log('💡 Generate SSL certificates with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
      process.exit(1);
    }
    
    server = createHttpsServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }, app);
  } catch (error) {
    console.error('❌ Failed to create HTTPS server:', error);
    process.exit(1);
  }
} else {
  server = createServer(app);
}

const allowedOrigins = getAllowedOrigins();

console.log(`CORS configuration for ${NODE_ENV}:`, allowedOrigins);

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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a session room
  socket.on('join-session', (sessionId: string) => {
    console.log(`User ${socket.id} joining session: ${sessionId}`);
    socket.join(sessionId);
    
    // Notify others in the room that a new user joined
    socket.to(sessionId).emit('user-joined', {
      userId: socket.id,
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
    console.log(`User ${socket.id} leaving session: ${sessionId}`);
    socket.leave(sessionId);
    
    // Notify others in the room that a user left
    socket.to(sessionId).emit('user-left', {
      userId: socket.id,
      message: `User ${socket.id} left the session`
    });
  });

  // Handle state changes (real-time synchronization)
  socket.on('state-change', (data: { sessionId: string; state: any; fromUser: string }) => {
    console.log(`State change from user ${data.fromUser} in session ${data.sessionId}`);
    
    // Save the state change to the session file automatically
    const saved = saveSessionToFile(data.sessionId, data.state, 'WebSocket');
    
    if (!saved) {
      console.error(`Failed to auto-save session ${data.sessionId} via WebSocket`);
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
    console.log('User disconnected:', socket.id);
  });
});

// Define types for session data
interface SessionState {
  timestamp?: string;
  [key: string]: any;
}

interface Session {
  id: string;
  timestamp: string;
  state: SessionState;
}

// Helper function to get session file path
const getSessionFilePath = (id: string): string => {
  return join(sessionsDir, `${id}.json`);
};

// Helper function to save session (used by both WebSocket and API)
const saveSessionToFile = (sessionId: string, sessionState: SessionState, source: string = 'API'): boolean => {
  try {
    // Ensure timestamp is present
    if (!sessionState.timestamp) {
      sessionState.timestamp = new Date().toISOString();
    }
    
    // Create the session object
    const session: Session = {
      id: sessionId,
      timestamp: sessionState.timestamp,
      state: sessionState
    };
    
    // Save to file
    const filePath = getSessionFilePath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    console.log(`Session saved via ${source}: ${sessionId} at ${new Date(sessionState.timestamp).toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.error(`Error saving session ${sessionId} via ${source}:`, error);
    return false;
  }
};

// Route to save a session
app.post('/api/sessions', (req: Request, res: Response): void => {
  const { id, state }: { id: string; state: SessionState } = req.body;
  
  if (!id || !state) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  // Save using the helper function
  const saved = saveSessionToFile(id, state, 'API');
  
  if (saved) {
    res.json({ id, timestamp: state.timestamp || new Date().toISOString() });
  } else {
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Route to get a session
app.get('/api/sessions/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  
  try {
    const filePath = getSessionFilePath(id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const session = JSON.parse(data);
    
    console.log(`Session loaded: ${id}`);
    res.json(session);
  } catch (error) {
    console.error(`Error loading session ${id}:`, error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Route to list all sessions
// TODO - Make this endpoint private (SECURITY)
app.get('/api/sessions', (_req: Request, res: Response): void => {
  try {
    const sessionsList: Array<{ id: string; timestamp: string }> = [];
    const files = fs.readdirSync(sessionsDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const id = file.replace('.json', '');
        const filePath = getSessionFilePath(id);
        
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const session = JSON.parse(data);
          sessionsList.push({
            id: session.id,
            timestamp: session.timestamp
          });
        } catch (error) {
          console.error(`Error reading session file ${file}:`, error);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    sessionsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json(sessionsList);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Route to delete a session
app.delete('/api/sessions/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  
  try {
    const filePath = getSessionFilePath(id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    fs.unlinkSync(filePath);
    console.log(`Session deleted: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting session ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Start the server
server.listen(PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  const wsProtocol = USE_HTTPS ? 'wss' : 'ws';
  
  console.log(`🚀 Server running on port ${PORT} (${NODE_ENV} mode, ${protocol.toUpperCase()})`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 CORS origins:`, allowedOrigins);
  console.log(`📂 Data directory: ${dataDir}`);
  
  if (NODE_ENV === 'development') {
    console.log(`🔗 Local API URL: ${protocol}://localhost:${PORT}/api`);
    console.log(`🔗 Local WebSocket URL: ${wsProtocol}://localhost:${PORT}`);
  }
  
  if (USE_HTTPS) {
    console.log(`🔒 HTTPS enabled with SSL certificates`);
  }
  
  if (NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    console.warn('⚠️  WARNING: Consider setting ALLOWED_ORIGINS for better security in production');
  }
}).on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else if (error.code === 'ENOENT' && USE_HTTPS) {
    console.error(`❌ SSL certificate files not found. Please check SSL_KEY_PATH and SSL_CERT_PATH`);
  } else {
    console.error(`❌ Server failed to start:`, error.message);
  }
  process.exit(1);
});
