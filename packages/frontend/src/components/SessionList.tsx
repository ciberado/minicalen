import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import logger from '../logger';
import { API_BASE_URL } from '../config/api';

interface Session {
  id: string;
  name: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  accessLevel?: 'viewer' | 'editor' | 'owner';
}

interface SessionListProps {
  open: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onShareSession: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  open,
  onClose,
  currentSessionId,
  onSelectSession,
  onShareSession,
}) => {
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && isAuthenticated) {
      loadSessions();
    }
  }, [open, isAuthenticated]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
      logger.info('Sessions loaded:', data.sessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
      logger.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Calendar',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      logger.info('Session created:', data.session);
      
      // Reload sessions and select the new one
      await loadSessions();
      onSelectSession(data.session.id);
      onClose();
    } catch (err) {
      logger.error('Error creating session:', err);
      setError('Failed to create new calendar');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this calendar?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      logger.info('Session deleted:', sessionId);
      await loadSessions();

      // If we deleted the current session, close the list
      if (sessionId === currentSessionId) {
        onClose();
      }
    } catch (err) {
      logger.error('Error deleting session:', err);
      setError('Failed to delete calendar');
    }
  };

  const handleShareSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onShareSession(sessionId);
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>My Calendars</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            Sign in to access multiple calendars and share them with others.
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          My Calendars
          <Button
            startIcon={<AddIcon />}
            onClick={handleCreateSession}
            variant="contained"
            size="small"
          >
            New Calendar
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No calendars yet. Create your first one!
          </Typography>
        ) : (
          <List>
            {sessions.map((session) => (
              <ListItem
                key={session.id}
                disablePadding
                secondaryAction={
                  <Box>
                    {session.accessLevel === 'owner' && (
                      <IconButton
                        edge="end"
                        aria-label="share"
                        onClick={(e) => handleShareSession(session.id, e)}
                        sx={{ mr: 1 }}
                      >
                        <ShareIcon />
                      </IconButton>
                    )}
                    {(session.accessLevel === 'owner' || session.isAnonymous) && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                }
              >
                <ListItemButton
                  selected={session.id === currentSessionId}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {session.name}
                        {session.accessLevel && session.accessLevel !== 'owner' && (
                          <Chip
                            label={session.accessLevel}
                            size="small"
                            color={session.accessLevel === 'editor' ? 'primary' : 'default'}
                          />
                        )}
                      </Box>
                    }
                    secondary={`Updated: ${new Date(session.updatedAt).toLocaleDateString()}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
