import { IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useSession } from './SessionContext';
import { useState, useEffect } from 'react';
import { SxProps, Theme } from '@mui/material/styles';

interface SaveButtonProps {
  sx?: SxProps<Theme>;
}

const SaveButton = ({ sx }: SaveButtonProps) => {
  const { saveSession, sessionId, timestamp } = useSession();
  const [isShining, setIsShining] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  
  // Watch for timestamp changes to trigger shine effect
  useEffect(() => {
    if (timestamp && timestamp !== lastTimestamp) {
      setIsShining(true);
      setLastTimestamp(timestamp);
      
      // Remove shine effect after animation completes
      const timer = setTimeout(() => {
        setIsShining(false);
      }, 1000); // 1 second shine duration
      
      return () => clearTimeout(timer);
    }
  }, [timestamp, lastTimestamp]);
  
  const handleSave = async () => {
    await saveSession();
  };
  
  // Create tooltip text
  const tooltipText = sessionId 
    ? `Update Session (Last saved: ${timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'})`
    : 'Save Session';
  
  return (
    <Tooltip title={tooltipText}>
      <IconButton
        color="primary"
        onClick={handleSave}
        size="medium"
        sx={{
          ...sx,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          ...(isShining && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
              animation: 'shine 1s ease-out',
              zIndex: 1,
            },
            '& .MuiSvgIcon-root': {
              filter: 'drop-shadow(0 0 8px rgba(25, 118, 210, 0.6))',
              transform: 'scale(1.1)',
              transition: 'all 0.3s ease',
            }
          }),
          '@keyframes shine': {
            '0%': {
              left: '-100%',
            },
            '100%': {
              left: '100%',
            },
          },
        }}
      >
        <SaveIcon />
      </IconButton>
    </Tooltip>
  );
};

export default SaveButton;
