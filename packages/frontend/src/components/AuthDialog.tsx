import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import { signIn, signUp } from '../auth/client';
import { useAuth } from '../hooks/useAuth';
import logger from '../logger';

export const AuthDialog: React.FC = () => {
  const { showAuthDialog, setShowAuthDialog } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setShowAuthDialog(false);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp.email({
          email,
          password,
          name: name || '',
        });

        if (result.error) {
          setError(result.error.message || 'Sign up failed');
          logger.error('Sign up error:', result.error);
        } else {
          logger.info('Sign up successful');
          handleClose();
        }
      } else {
        const result = await signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || 'Sign in failed');
          logger.error('Sign in error:', result.error);
        } else {
          logger.info('Sign in successful');
          handleClose();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      logger.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <Dialog
      open={showAuthDialog}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {mode === 'signin' ? 'Sign In' : 'Create Account'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {mode === 'signup' && (
            <TextField
              margin="normal"
              fullWidth
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Link
                component="button"
                type="button"
                onClick={toggleMode}
                sx={{ cursor: 'pointer' }}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Link>
            </Typography>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Your calendar will remain accessible without an account
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
