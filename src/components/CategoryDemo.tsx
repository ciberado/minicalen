import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryValue from './CategoryValue';

// Default color palette - same as in CategoryValue component
const DEFAULT_COLORS = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#FF9800'  // Orange
];

interface Category {
  id: string;
  label: string;
  color: string;
  active: boolean;
}

const CategoryDemo = () => {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', label: 'Work', color: DEFAULT_COLORS[0], active: true },
    { id: '2', label: 'Personal', color: DEFAULT_COLORS[5], active: true },
    { id: '3', label: 'Errands', color: DEFAULT_COLORS[8], active: false }
  ]);

  const handleLabelChange = (id: string, newLabel: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, label: newLabel } : cat
    ));
  };

  const handleColorChange = (id: string, newColor: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, color: newColor } : cat
    ));
  };

  const handleActiveChange = (id: string, isActive: boolean) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, active: isActive } : cat
    ));
  };

  // Get a new color for each new category, cycling through the palette
  const getNextColor = () => {
    // Get all colors currently in use
    const usedColors = categories.map(cat => cat.color);
    
    // Find the first unused color
    const unusedColor = DEFAULT_COLORS.find(color => !usedColors.includes(color));
    
    if (unusedColor) {
      return unusedColor;
    } else {
      // If all colors are used, cycle through them based on category count
      return DEFAULT_COLORS[categories.length % DEFAULT_COLORS.length];
    }
  };

  const addNewCategory = () => {
    const newId = (Math.max(...categories.map(c => parseInt(c.id, 10))) + 1).toString();
    setCategories([
      ...categories,
      { 
        id: newId, 
        label: 'New Category', 
        color: getNextColor(), 
        active: true 
      }
    ]);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Categories
      </Typography>
      
      <Box sx={{ mt: 1 }}>
        {categories.map(category => (
          <CategoryValue 
            key={category.id}
            id={category.id}
            initialLabel={category.label}
            initialColor={category.color}
            initialActive={category.active}
            onLabelChange={handleLabelChange}
            onColorChange={handleColorChange}
            onActiveChange={handleActiveChange}
          />
        ))}
      </Box>
      
      <Button 
        size="small"
        startIcon={<AddIcon />}
        onClick={addNewCategory}
        sx={{ mt: 1, fontSize: '0.8rem' }}
      >
        Add Category
      </Button>
    </Box>
  );
};

export default CategoryDemo;
