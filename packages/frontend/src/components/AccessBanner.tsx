import React, { useState } from 'react';
import { Alert, AlertTitle, Button, Collapse } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

interface AccessBannerProps {
  accessLevel?: 'viewer' | 'editor' | 'owner';
  isAnonymous: boolean;
  onClaim?: () => void;
}

export const AccessBanner: React.FC<AccessBannerProps> = ({
  accessLevel,
  isAnonymous,
  onClaim,
}) => {
  const { isAuthenticated, setShowAuthDialog } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if dismissed or if user is owner
  if (dismissed || accessLevel === 'owner') {
    return null;
  }

  // Anonymous user banner - encourage sign up to save work
  if (isAnonymous && !isAuthenticated) {
    return (
      <Collapse in={!dismissed}>
        <Alert
          severity="info"
          onClose={() => setDismissed(true)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowAuthDialog(true)}
            >
              Sign Up
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <AlertTitle>Working Anonymously</AlertTitle>
          Sign up to save your calendar and access it from any device
        </Alert>
      </Collapse>
    );
  }

  // Authenticated user viewing anonymous calendar - allow claiming
  if (isAnonymous && isAuthenticated && onClaim) {
    return (
      <Collapse in={!dismissed}>
        <Alert
          severity="success"
          onClose={() => setDismissed(true)}
          action={
            <Button color="inherit" size="small" onClick={onClaim}>
              Save to My Account
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <AlertTitle>Anonymous Calendar</AlertTitle>
          Save this calendar to your account to access it later
        </Alert>
      </Collapse>
    );
  }

  // User with viewer/editor access
  if (accessLevel === 'viewer' || accessLevel === 'editor') {
    return (
      <Collapse in={!dismissed}>
        <Alert
          severity={accessLevel === 'viewer' ? 'warning' : 'info'}
          onClose={() => setDismissed(true)}
          sx={{ mb: 2 }}
        >
          <AlertTitle>
            {accessLevel === 'viewer' ? 'Viewing Shared Calendar' : 'Editing Shared Calendar'}
          </AlertTitle>
          {accessLevel === 'viewer'
            ? 'You can view this calendar but cannot make changes'
            : 'You have editing access to this shared calendar'}
        </Alert>
      </Collapse>
    );
  }

  return null;
};
