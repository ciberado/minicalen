import { useState, forwardRef, useImperativeHandle, useEffect, useId } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryValue from './CategoryValue';
import { useGlobalExclusive } from './GlobalExclusiveContext';

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
  globalExclusive?: boolean; // Whether this component participates in global exclusive selection
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
  exclusive = false,  // Default to non-exclusive mode
  globalExclusive = false  // Default to not participating in global exclusive
}, ref) => {
  const componentId = useId(); // Generate a stable ID for this component instance
  const globalExclusiveContext = globalExclusive ? useGlobalExclusive() : null;
  
  // Debug logging
  useEffect(() => {
    if (globalExclusive) {
      console.log(`[Categories ${title}] Component initialized with globalExclusive=true, componentId=${componentId}`);
      console.log(`[Categories ${title}] Initial categories:`, initialCategories || internalCategories);
    }
  }, []);
  
  // If external categories are provided, use them. Otherwise, use internal state
  const [internalCategories, setInternalCategories] = useState<Category[]>([
    { id: '1', label: 'Work', color: DEFAULT_COLORS[0], active: true, selected: false },
    { id: '2', label: 'Personal', color: DEFAULT_COLORS[5], active: true, selected: false },
    { id: '3', label: 'Errands', color: DEFAULT_COLORS[8], active: false, selected: false }
  ]);

  // Determine which categories to use (external or internal)
  const categories = initialCategories || internalCategories;
  
  // Register initial selected category with global exclusive context if any
  useEffect(() => {
    if (globalExclusive && globalExclusiveContext) {
      const selectedCategory = categories.find(cat => cat.selected && cat.active);
      if (selectedCategory) {
        console.log(`[Categories ${title}] Found initially selected category, registering with global context:`, selectedCategory);
        globalExclusiveContext.selectCategory(selectedCategory.id, componentId);
      }
    }
  }, []);
  
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
  
  // Register/unregister with global exclusive context
  useEffect(() => {
    if (globalExclusive && globalExclusiveContext) {
      globalExclusiveContext.registerComponent(componentId);
      return () => {
        globalExclusiveContext.unregisterComponent(componentId);
      };
    }
  }, [globalExclusive, globalExclusiveContext, componentId]);
  
  // Listen for global exclusive selection changes
  useEffect(() => {
    if (globalExclusive && globalExclusiveContext && globalExclusiveContext.selectedCategory) {
      const { /* categoryId not used, so removed to fix lint error */ componentId: selectedComponentId } = globalExclusiveContext.selectedCategory;
      
      console.log(`[Categories ${title}] Global selection changed to component: ${selectedComponentId}, current componentId: ${componentId}`);
      
      // If selection is in another component, deselect all categories in this component
      if (selectedComponentId !== componentId) {
        if (initialCategories) {
          // For external categories, we need to notify the parent via callback
          const hasSelectedCategories = initialCategories.some(cat => cat.selected);
          
          if (hasSelectedCategories) {
            const newCategories = initialCategories.map(cat => ({
              ...cat,
              selected: false
            }));
            // Update via callback
            if (onCategoriesChange) {
              console.log(`[Categories ${componentId}] Deselecting all categories due to global exclusive selection in another component`);
              onCategoriesChange(newCategories);
            }
          }
        } else {
          // For internal categories
          const hasSelectedCategories = internalCategories.some(cat => cat.selected);
          
          if (hasSelectedCategories) {
            const newCategories = internalCategories.map(cat => ({
              ...cat,
              selected: false
            }));
            console.log(`[Categories ${componentId}] Deselecting all internal categories due to global exclusive selection in another component`);
            setInternalCategories(newCategories);
            
            // Notify about selection changes
            if (onSelectionChange) {
              onSelectionChange([]);
            }
          }
        }
      }
    }
  }, [globalExclusive, globalExclusiveContext, componentId, internalCategories, initialCategories, onSelectionChange]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getSelectedCategories: () => {
      return categories.filter(cat => cat.selected && cat.active);
    }
  }));
  
  // Update either external state via callback or internal state
  const updateCategories = (newCategories: Category[]) => {
    console.log(`[Categories ${title}] Updating categories:`, newCategories);
    
    // Check if any category is selected and update global exclusive context if needed
    if (globalExclusive && globalExclusiveContext) {
      const selectedCategory = newCategories.find(cat => cat.selected && cat.active);
      if (selectedCategory) {
        console.log(`[Categories ${title}] Selected category found during update, notifying global context:`, selectedCategory);
        globalExclusiveContext.selectCategory(selectedCategory.id, componentId);
      }
    }
    
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
    console.log(`[Categories ${title}] Selection change: id=${id}, isSelected=${isSelected}, exclusive=${exclusive}, globalExclusive=${globalExclusive}`);
    
    let newCategories;
    
    if (exclusive && isSelected) {
      // In exclusive mode, deselect all other categories when one is selected
      console.log(`[Categories ${title}] Exclusive mode: deselecting all other categories`);
      newCategories = categories.map(cat => ({
        ...cat,
        selected: cat.id === id // Only the clicked item will be selected
      }));
    } else if (globalExclusive && globalExclusiveContext) {
      if (isSelected) {
        // In global exclusive mode, update the global context
        console.log(`[Categories ${title}] Global exclusive mode: updating global context and deselecting all other categories`);
        globalExclusiveContext.selectCategory(id, componentId);
        
        // Deselect all categories and select only the current one
        newCategories = categories.map(cat => ({
          ...cat,
          selected: cat.id === id
        }));
      } else {
        // If we're deselecting a category in global exclusive mode, clear the global selection
        console.log(`[Categories ${title}] Global exclusive mode: clearing selection for category ${id}`);
        globalExclusiveContext.clearSelection(id, componentId);
        
        // Update local state
        newCategories = categories.map(cat => 
          cat.id === id ? { ...cat, selected: false } : cat
        );
      }
    } else {
      // In non-exclusive mode, or when deselecting in exclusive mode
      console.log(`[Categories ${title}] Regular selection mode: only updating the clicked category`);
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
    
    if (exclusive || (globalExclusive && globalExclusiveContext)) {
      // In exclusive mode or global exclusive mode, deselect all existing categories when adding a new one
      newCategories = [
        ...categories.map(cat => ({ ...cat, selected: false })),
        { 
          id: newId, 
          label: 'New Category', 
          color: getNextColor(), 
          active: true,
          selected: true // Auto-select the new category
        }
      ];
      
      // Update global exclusive context if needed
      if (globalExclusive && globalExclusiveContext) {
        globalExclusiveContext.selectCategory(newId, componentId);
      }
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
