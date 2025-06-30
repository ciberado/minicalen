import { useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, Divider } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import LabelIcon from '@mui/icons-material/Label';
import Categories, { Category } from './Categories';

interface SidebarProps {
  width: string;
}

const Sidebar = ({ width }: SidebarProps) => {
  // Initial category data for each group
  const [forecolorCategories, setForecolorCategories] = useState<Category[]>([
    { id: '1', label: 'Important', color: '#F44336', active: true },
    { id: '2', label: 'Work', color: '#2196F3', active: true },
    { id: '3', label: 'Personal', color: '#4CAF50', active: true }
  ]);
  
  const [backcolorCategories, setBackcolorCategories] = useState<Category[]>([
    { id: '1', label: 'Urgent', color: '#E91E63', active: true },
    { id: '2', label: 'Waiting', color: '#FF9800', active: true }
  ]);
  
  const [tagCategories, setTagCategories] = useState<Category[]>([
    { id: '1', label: 'Home', color: '#9C27B0', active: true },
    { id: '2', label: 'Office', color: '#009688', active: true },
    { id: '3', label: 'Travel', color: '#673AB7', active: true },
    { id: '4', label: 'Call', color: '#3F51B5', active: false }
  ]);

  // Handler functions for category changes
  const handleForecolorChange = (newCategories: Category[]) => {
    setForecolorCategories(newCategories);
    // You could also save to localStorage or send to a backend API here
  };

  const handleBackcolorChange = (newCategories: Category[]) => {
    setBackcolorCategories(newCategories);
  };

  const handleTagsChange = (newCategories: Category[]) => {
    setTagCategories(newCategories);
  };
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
      
      {/* Categories section */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormatColorTextIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              FOREGROUND COLOR
            </Typography>
          </Box>
          <Categories 
            title="" 
            categories={forecolorCategories} 
            onCategoriesChange={handleForecolorChange}
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormatColorFillIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              BACKGROUND COLOR
            </Typography>
          </Box>
          <Categories 
            title="" 
            categories={backcolorCategories} 
            onCategoriesChange={handleBackcolorChange}
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LabelIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              TAGS
            </Typography>
          </Box>
          <Categories 
            title="" 
            categories={tagCategories} 
            onCategoriesChange={handleTagsChange}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default Sidebar;
