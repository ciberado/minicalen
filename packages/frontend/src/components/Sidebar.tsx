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
    textCategories,
    setTextCategories,
    generateCategorySymbol,
    selectCategory  // Add global selection function
  } = useCategories();
  
  // Refs to access the Categories component methods
  const foregroundCategoriesRef = useRef<CategoriesHandle>(null);
  const textCategoriesRef = useRef<CategoriesHandle>(null);
  
  // Debug helper to track category selection changes
  useEffect(() => {
    console.log('Foreground categories updated:', foregroundCategories);
    const selectedForeground = foregroundCategories.filter(cat => cat.selected);
    if (selectedForeground.length > 0) {
      console.log('Selected foreground category:', selectedForeground[0].label);
    }
  }, [foregroundCategories]);
  
  useEffect(() => {
    console.log('Text categories updated:', textCategories);
    const selectedText = textCategories.filter(cat => cat.selected);
    if (selectedText.length > 0) {
      console.log('Selected text category:', selectedText[0].label);
    } else {
      console.log('No text category selected');
    }
    console.log('All text categories:', textCategories.map(cat => ({
      label: cat.label,
      selected: cat.selected,
      symbol: generateCategorySymbol(cat.label)
    })));
  }, [textCategories, generateCategorySymbol]);
  
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
            onCategorySelect={(categoryId) => selectCategory(categoryId, 'foreground')}
            exclusive={true} // Only one foreground category can be selected
            showColorPicker={true}
          />
        </Box>
        
        {/* Text Symbol Categories */}
        <Box mb={3}>
          <Categories
            ref={textCategoriesRef}
            title="Text Labels"
            categories={textCategories.map(cat => ({
              ...cat,
              label: `${cat.label} [${generateCategorySymbol(cat.label)}]`
            }))}
            onCategoriesChange={(updatedCategories) => {
              // Remove symbol from labels before saving
              const cleanCategories = updatedCategories.map(cat => {
                let categoryId = cat.id;
                
                // If this is a new category with a numeric ID, convert it to text category format
                if (/^\d+$/.test(cat.id)) {
                  // Find the highest existing text category ID number
                  const existingTextIds = textCategories
                    .map(tc => parseInt(tc.id.replace(/^t/, '') || '0'))
                    .filter(num => !isNaN(num));
                  const maxTextId = existingTextIds.length > 0 ? Math.max(...existingTextIds) : 0;
                  categoryId = `t${maxTextId + 1}`;
                }
                
                return {
                  ...cat,
                  id: categoryId,
                  label: cat.label.replace(/ \[.*\]$/, '')
                };
              });
              setTextCategories(cleanCategories);
            }}
            onCategorySelect={(categoryId) => selectCategory(categoryId, 'text')}
            exclusive={true} // Only one text category can be selected for interaction
            showColorPicker={true}
          />
        </Box>        
      </Box>
    </Paper>
  );
};

export default Sidebar;
