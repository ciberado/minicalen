import { Box } from '@mui/material';
import { ReactNode } from 'react';
import Calendar from './Calendar';

interface MainContentProps {
  children?: ReactNode;
  marginLeft: string;
}

const MainContent = ({ children, marginLeft }: MainContentProps) => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: '100vh',
        width: `calc(100% - ${marginLeft})`,
        ml: marginLeft,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Prevent scrolling
        position: 'relative',
      }}
    >
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {children || <Calendar />}
      </Box>
    </Box>
  );
};

export default MainContent;
