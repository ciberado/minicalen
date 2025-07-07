import { Box } from '@mui/material';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { GlobalExclusiveProvider } from './GlobalExclusiveContext';

// Calculate width for a 20-character column
// Using approximately 8px per character for a standard font
const SIDEBAR_WIDTH = '200px'; // Approximating 20 characters × ~10px per character

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <GlobalExclusiveProvider>
      <Box sx={{ 
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <Sidebar width={SIDEBAR_WIDTH} />
        <MainContent marginLeft={SIDEBAR_WIDTH}>
          {children}
        </MainContent>
      </Box>
    </GlobalExclusiveProvider>
  );
};

export default Layout;
