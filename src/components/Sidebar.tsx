import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, Divider } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryDemo from './CategoryDemo';

interface SidebarProps {
  width: string;
}

const Sidebar = ({ width }: SidebarProps) => {
  return (
    <Paper 
      elevation={2}
      sx={{ 
        width,
        height: '100vh',
        borderRadius: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
        overflowY: 'auto',
        backgroundColor: (theme) => theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 2 }}>
          MiniCalen
        </Typography>
      </Box>
      <Divider />
      <Divider />
      
      {/* Categories section */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        <CategoryDemo />
      </Box>
    </Paper>
  );
};

export default Sidebar;
