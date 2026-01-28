import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { API_BASE_URL } from '../config/api';
import logger from '../logger';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  sessionId,
}) => {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'viewer' | 'editor'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    onClose();
    setEmail('');
    setAccessLevel('viewer');
    setError(null);
    setSuccess(false);
  };

  const handleShare = async () => {
    if (!sessionId || !email) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          accessLevel,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share calendar');
      }

      logger.info('Calendar shared successfully');
      setSuccess(true);
      
      // Clear form after 2 seconds and close
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share calendar';
      setError(message);
      logger.error('Error sharing session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Calendar</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Calendar shared successfully!
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the email address of the person you want to share this calendar with.
            They must have an account to access it.
          </Typography>

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth disabled={loading || success}>
            <InputLabel>Access Level</InputLabel>
            <Select
              value={accessLevel}
              label="Access Level"
              onChange={(e) => setAccessLevel(e.target.value as 'viewer' | 'editor')}
            >
              <MenuItem value="viewer">
                <Box>
                  <Typography variant="body1">Viewer</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Can view the calendar but not make changes
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="editor">
                <Box>
                  <Typography variant="body1">Editor</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Can view and edit the calendar
                  </Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleShare}
          variant="contained"
          disabled={loading || success || !email}
        >
          {loading ? <CircularProgress size={24} /> : 'Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
