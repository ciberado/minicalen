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

export interface Category {
  id: string;
  label: string;
  color: string | null;  // Make color optional by allowing null
  active: boolean;
}

interface CategoriesProps {
  title?: string;
  categories?: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  readOnly?: boolean;
  showColorPicker?: boolean;  // Add option to hide color picker
}

const Categories = ({
  title = 'Categories',
  categories: initialCategories,
  onCategoriesChange,
  readOnly = false,
  showColorPicker = true
}: CategoriesProps) => {
  // If external categories are provided, use them. Otherwise, use internal state
  const [internalCategories, setInternalCategories] = useState<Category[]>([
    { id: '1', label: 'Work', color: DEFAULT_COLORS[0], active: true },
    { id: '2', label: 'Personal', color: DEFAULT_COLORS[5], active: true },
    { id: '3', label: 'Errands', color: DEFAULT_COLORS[8], active: false }
  ]);

  // Determine which categories to use (external or internal)
  const categories = initialCategories || internalCategories;
  
  // Update either external state via callback or internal state
  const updateCategories = (newCategories: Category[]) => {
    if (onCategoriesChange) {
      onCategoriesChange(newCategories);
    } else {
      setInternalCategories(newCategories);
    }
  };

  const handleLabelChange = (id: string, newLabel: string) => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, label: newLabel } : cat
    );
    updateCategories(newCategories);
  };

  const handleColorChange = (id: string, newColor: string | null) => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, color: newColor } : cat
    );
    updateCategories(newCategories);
  };

  const handleActiveChange = (id: string, isActive: boolean) => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, active: isActive } : cat
    );
    updateCategories(newCategories);
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
    // Create a unique ID - either based on current highest ID or timestamp
    let newId: string;
    if (categories.length > 0) {
      const maxId = Math.max(...categories.map(c => parseInt(c.id, 10) || 0));
      newId = (maxId + 1).toString();
    } else {
      newId = '1';
    }
    
    const newCategories = [
      ...categories,
      { 
        id: newId, 
        label: 'New Category', 
        color: getNextColor(), 
        active: true 
      }
    ];
    
    updateCategories(newCategories);
  };
  
  // Allow deletion of categories if needed
  const handleDeleteCategory = (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    updateCategories(newCategories);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
      )}
      
      <Box sx={{ mt: title ? 1 : 0 }}>
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
            showColorPicker={showColorPicker}
          />
        ))}
      </Box>
      
      {!readOnly && (
        <Button 
          size="small"
          startIcon={<AddIcon />}
          onClick={addNewCategory}
          sx={{ mt: 1, fontSize: '0.8rem' }}
        >
          Add Category
        </Button>
      )}
    </Box>
  );
};

export default Categories;
