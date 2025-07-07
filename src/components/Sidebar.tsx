import { useRef, useEffect } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import Categories, { CategoriesHandle } from './Categories';
import { useCategories } from './CategoryContext';
import SaveButton from './SaveButton';

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
  
  // Debug helper to track category selection changes
  useEffect(() => {
    console.log('Foreground categories updated:', foregroundCategories);
    const selectedForeground = foregroundCategories.filter(cat => cat.selected);
    if (selectedForeground.length > 0) {
      console.log('Selected foreground category:', selectedForeground[0].label);
    }
  }, [foregroundCategories]);
  
  useEffect(() => {
    console.log('Background categories updated:', backgroundCategories);
    const selectedBackground = backgroundCategories.filter(cat => cat.selected);
    if (selectedBackground.length > 0) {
      console.log('Selected background category:', selectedBackground[0].label);
    }
  }, [backgroundCategories]);
  
  useEffect(() => {
    console.log('Tag categories updated:', tagCategories);
    const selectedTags = tagCategories.filter(cat => cat.selected);
    if (selectedTags.length > 0) {
      console.log('Selected tag categories:', selectedTags.map(cat => cat.label));
    }
  }, [tagCategories]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MiniCalen
          </Typography>
          <SaveButton />
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Foreground Color Categories */}
        <Box mb={3}>
          <Categories
            ref={foregroundCategoriesRef}
            title="Foreground"
            categories={foregroundCategories}
            onCategoriesChange={setForegroundCategories}
            exclusive={true} // Only one foreground category can be selected
            globalExclusive={true}
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
            globalExclusive={true}
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
            globalExclusive={true}
            showColorPicker={false}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default Sidebar;
