import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Sessions storage file
const sessionsFile = join(dataDir, 'sessions.json');

// Initialize sessions storage if it doesn't exist
if (!fs.existsSync(sessionsFile)) {
  fs.writeFileSync(sessionsFile, JSON.stringify({}));
}

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

interface SessionsStorage {
  [key: string]: Session;
}

// Load sessions
let sessions: SessionsStorage = {};
try {
  const data = fs.readFileSync(sessionsFile, 'utf8');
  sessions = JSON.parse(data);
} catch (error) {
  console.error('Error loading sessions:', error);
  sessions = {};
}

// Save sessions to file
const saveSessions = (): void => {
  try {
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
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
  
  // Store the session
  sessions[id] = {
    id,
    timestamp: state.timestamp,
    state
  };
  
  // Save to file
  saveSessions();
  
  console.log(`Session saved: ${id}`);
  res.json({ id, timestamp: state.timestamp });
});

// Route to get a session
app.get('/api/sessions/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  
  if (!sessions[id]) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  console.log(`Session loaded: ${id}`);
  res.json(sessions[id]);
});

// Route to list all sessions
app.get('/api/sessions', (_req: Request, res: Response): void => {
  const sessionsList = Object.values(sessions).map(session => ({
    id: session.id,
    timestamp: session.timestamp
  }));
  
  res.json(sessionsList);
});

// Route to delete a session
app.delete('/api/sessions/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  
  if (!sessions[id]) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  delete sessions[id];
  saveSessions();
  
  console.log(`Session deleted: ${id}`);
  res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - with auto-reload enabled`);
});
