import { IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useSession } from './SessionContext';

interface SaveButtonProps {
  sx?: Record<string, any>;
}

const SaveButton = ({ sx }: SaveButtonProps) => {
  const { saveSession, sessionId, timestamp } = useSession();
  
  // Create tooltip text
  const tooltipText = sessionId 
    ? `Update Session (Last saved: ${timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'})`
    : 'Save Session';
  
  return (
    <Tooltip title={tooltipText}>
      <IconButton
        color="primary"
        onClick={saveSession}
        size="medium"
        sx={sx}
      >
        <SaveIcon />
      </IconButton>
    </Tooltip>
  );
};

export default SaveButton;
