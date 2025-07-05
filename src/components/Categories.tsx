import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
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
  selected?: boolean;  // Add selected property
}

interface CategoriesProps {
  title?: string;
  categories?: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  onSelectionChange?: (selectedCategories: Category[]) => void;  // Add selection change handler
  readOnly?: boolean;
  showColorPicker?: boolean;  // Add option to hide color picker
  exclusive?: boolean;  // Whether only one category can be selected at a time
}

// Component handle type - expose public methods for parent components
export interface CategoriesHandle {
  getSelectedCategories: () => Category[];
}

const Categories = forwardRef<CategoriesHandle, CategoriesProps>(({
  title = 'Categories',
  categories: initialCategories,
  onCategoriesChange,
  onSelectionChange,
  readOnly = false,
  showColorPicker = true,
  exclusive = false  // Default to non-exclusive mode
}, ref) => {
  // If external categories are provided, use them. Otherwise, use internal state
  const [internalCategories, setInternalCategories] = useState<Category[]>([
    { id: '1', label: 'Work', color: DEFAULT_COLORS[0], active: true, selected: false },
    { id: '2', label: 'Personal', color: DEFAULT_COLORS[5], active: true, selected: false },
    { id: '3', label: 'Errands', color: DEFAULT_COLORS[8], active: false, selected: false }
  ]);

  // Determine which categories to use (external or internal)
  const categories = initialCategories || internalCategories;
  
  // If in exclusive mode, ensure only one category is selected
  useEffect(() => {
    if (exclusive && !initialCategories) {
      const selectedCount = internalCategories.filter(cat => cat.selected).length;
      
      if (selectedCount > 1) {
        // If multiple items are selected, keep only the first one selected
        const newCategories = [...internalCategories];
        let foundSelected = false;
        
        for (let i = 0; i < newCategories.length; i++) {
          if (newCategories[i].selected) {
            if (foundSelected) {
              newCategories[i].selected = false;
            } else {
              foundSelected = true;
            }
          }
        }
        
        setInternalCategories(newCategories);
      }
      
      // Ensure at least one category is selected
      if (selectedCount === 0 && internalCategories.length > 0) {
        const newCategories = [...internalCategories];
        newCategories[0].selected = true;
        setInternalCategories(newCategories);
      }
    }
  }, [exclusive, internalCategories, initialCategories]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getSelectedCategories: () => {
      return categories.filter(cat => cat.selected && cat.active);
    }
  }));
  
  // Update either external state via callback or internal state
  const updateCategories = (newCategories: Category[]) => {
    if (onCategoriesChange) {
      onCategoriesChange(newCategories);
    } else {
      setInternalCategories(newCategories);
    }
    
    // Notify about selection changes
    if (onSelectionChange) {
      const selectedCategories = newCategories.filter(cat => cat.selected && cat.active);
      onSelectionChange(selectedCategories);
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

  const handleSelectedChange = (id: string, isSelected: boolean) => {
    let newCategories;
    
    if (exclusive && isSelected) {
      // In exclusive mode, deselect all other categories when one is selected
      newCategories = categories.map(cat => ({
        ...cat,
        selected: cat.id === id // Only the clicked item will be selected
      }));
    } else {
      // In non-exclusive mode, or when deselecting in exclusive mode
      newCategories = categories.map(cat => 
        cat.id === id ? { ...cat, selected: isSelected } : cat
      );
    }
    
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
    
    let newCategories;
    
    if (exclusive) {
      // In exclusive mode, deselect all existing categories when adding a new one
      newCategories = [
        ...categories.map(cat => ({ ...cat, selected: false })),
        { 
          id: newId, 
          label: 'New Category', 
          color: getNextColor(), 
          active: true,
          selected: true // Auto-select the new category in exclusive mode
        }
      ];
    } else {
      // In non-exclusive mode, just add the new category without selecting it
      newCategories = [
        ...categories,
        { 
          id: newId, 
          label: 'New Category', 
          color: getNextColor(), 
          active: true,
          selected: false
        }
      ];
    }
    
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
            initialSelected={category.selected}
            onLabelChange={handleLabelChange}
            onColorChange={handleColorChange}
            onActiveChange={handleActiveChange}
            onSelectedChange={handleSelectedChange}
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
});

export default Categories;
