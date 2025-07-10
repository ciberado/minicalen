import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 3001;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

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

// Route to save a session
app.post('/api/sessions', (req: Request, res: Response): void => {
  const { id, state }: { id: string; state: SessionState } = req.body;
  
  if (!id || !state) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  // Add timestamp if not provided
  if (!state.timestamp) {
    state.timestamp = new Date().toISOString();
  }
  
  // Create the session object
  const session: Session = {
    id,
    timestamp: state.timestamp,
    state
  };
  
  // Save directly to file
  try {
    const filePath = getSessionFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    console.log(`Session saved: ${id}`);
    res.json({ id, timestamp: state.timestamp });
  } catch (error) {
    console.error(`Error saving session ${id}:`, error);
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
  console.log(`Server running on port ${PORT} - with auto-reload enabled`);
  console.log(`WebSocket server ready for connections`);
});
