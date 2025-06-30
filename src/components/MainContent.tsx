import { Box, Container, Paper, Typography } from '@mui/material';
import { ReactNode } from 'react';

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
        minHeight: '100vh',
        ml: marginLeft,
        pt: 3,
        pb: 3,
      }}
    >
      <Container maxWidth="xl">
        <Paper elevation={2} sx={{ p: 3, minHeight: 'calc(100vh - 48px)' }}>
          {children || (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="h4" color="text.secondary">
                Select an option from the sidebar
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default MainContent;
