import { Box } from '@mui/material';
import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { SessionList } from './SessionList';
import { ShareDialog } from './ShareDialog';
import { useSession } from './SessionContext';

// Calculate width for a 20-character column
// Using approximately 8px per character for a standard font
const SIDEBAR_WIDTH = '300px'; // Approximating 20 characters × ~10px per character

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { sessionId, loadSession } = useSession();
  const [showSessionList, setShowSessionList] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);

  const handleSelectSession = (newSessionId: string) => {
    loadSession(newSessionId);
  };

  const handleShareSession = (sessionIdToShare: string) => {
    setShareSessionId(sessionIdToShare);
    setShowShareDialog(true);
    setShowSessionList(false);
  };

  return (
    <>
      <Box sx={{ 
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <Sidebar
          width={SIDEBAR_WIDTH}
          onOpenSessions={() => setShowSessionList(true)}
        />
        <MainContent marginLeft={SIDEBAR_WIDTH}>
          {children}
        </MainContent>
      </Box>

      <SessionList
        open={showSessionList}
        onClose={() => setShowSessionList(false)}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onShareSession={handleShareSession}
      />

      <ShareDialog
        open={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setShareSessionId(null);
        }}
        sessionId={shareSessionId}
      />
    </>
  );
};

export default Layout;
