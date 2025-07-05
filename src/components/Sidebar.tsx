import { useRef } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import Categories, { CategoriesHandle } from './Categories';
import { useCategories } from './CategoryContext';

interface SidebarProps {
  width: string;
}

const Sidebar = ({ width }: SidebarProps) => {
  // Use the categories context
  const { 
    foregroundCategories, 
    setForegroundCategories,
    backgroundCategories,
    setBackgroundCategories,
    tagCategories,
    setTagCategories
  } = useCategories();
  
  // Refs to access the Categories component methods
  const foregroundCategoriesRef = useRef<CategoriesHandle>(null);
  const backgroundCategoriesRef = useRef<CategoriesHandle>(null);
  const tagCategoriesRef = useRef<CategoriesHandle>(null);

  return (
    <Paper 
      elevation={2}
      sx={{
        width: width,
        height: '100%',
        overflow: 'auto',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1200,
        borderRadius: 0,
      }}
    >
      <Box p={2}>
        <Typography variant="h6" component="div" sx={{ mb: 2 }}>
          MiniCalen
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Foreground Color Categories */}
        <Box mb={3}>
          <Categories
            ref={foregroundCategoriesRef}
            title="Foreground"
            categories={foregroundCategories}
            onCategoriesChange={setForegroundCategories}
            exclusive={true} // Only one foreground category can be selected
            showColorPicker={true}
          />
        </Box>
        
        {/* Background Color Categories */}
        <Box mb={3}>
          <Categories
            ref={backgroundCategoriesRef}
            title="Background"
            categories={backgroundCategories}
            onCategoriesChange={setBackgroundCategories}
            exclusive={true} // Only one background category can be selected
            showColorPicker={true}
          />
        </Box>
        
        {/* Tag Categories */}
        <Box mb={3}>
          <Categories
            ref={tagCategoriesRef}
            title="Tags"
            categories={tagCategories}
            onCategoriesChange={setTagCategories}
            exclusive={false} // Multiple tags can be selected
            showColorPicker={false}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default Sidebar;
