import { createContext, useState, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';

// Import the Category type from Categories component
import { Category } from './Categories';

// Interface for text categories with symbol support
export interface TextCategory {
  id: string;
  label: string;
  color: string;
  active: boolean;
  visible?: boolean;  // Add visibility property - controls opacity of visual hints
  selected?: boolean;
}

// Interface to store date information
interface DateInfo {
  color: string;
  categoryId: string; // Store which category this date is associated with
  textCategoryIds?: string[]; // Store which text categories this date is associated with
}

// Helper function to generate symbol from category label (all uppercase letters)
const generateSymbol = (label: string): string => {
  const uppercaseLetters = label.match(/[A-Z]/g);
  if (uppercaseLetters && uppercaseLetters.length > 0) {
    // Take first 2 uppercase letters
    return uppercaseLetters.slice(0, 2).join('');
  }
  // Fallback to first letter uppercase
  return label.charAt(0).toUpperCase();
};

// Helper function to sort text categories consistently by ID
const sortTextCategories = (categories: TextCategory[]): TextCategory[] => {
  return [...categories].sort((a, b) => {
    // Extract numeric part from IDs (e.g., 't1' -> 1, 't2' -> 2)
    const aNum = parseInt(a.id.replace(/^t/, '') || '0');
    const bNum = parseInt(b.id.replace(/^t/, '') || '0');
    return aNum - bNum;
  });
};

// Exported interface for date info entries (used by SessionContext)
export interface DateInfoEntry {
  color: string;
  categoryId: string;
  textCategoryIds?: string[];
}

// Interface for bulk remote state updates
export interface RemoteCategoryState {
  foregroundCategories: Category[];
  textCategories: TextCategory[];
  dateInfoMap: [string, DateInfoEntry][]; // Serialized as array of tuples
}

interface CategoryContextType {
  foregroundCategories: Category[];
  setForegroundCategories: (categories: Category[]) => void;
  textCategories: TextCategory[];
  setTextCategories: (categories: TextCategory[]) => void;
  selectedTextCategory: TextCategory | null; // Currently selected text category for interaction
  setSelectedTextCategory: (category: TextCategory | null) => void; // Function to set selected text category
  selectedDates: Map<string, string>; // Map of date strings to color strings (for backward compatibility)
  dateInfoMap: Map<string, DateInfo>; // Map of date strings to DateInfo objects
  setSelectedDate: (dateStr: string, color: string | null, categoryId?: string | null) => void; // Function to set/unset a date's color
  getSelectedDateColor: (dateStr: string) => string | null; // Function to get a date's color
  toggleTextCategory: (dateStr: string, categoryId: string) => void; // Function to toggle text category on/off for a date
  getDateTextCategories: (dateStr: string) => TextCategory[]; // Function to get text categories for a date
  generateCategorySymbol: (label: string) => string; // Function to generate symbol from label
  selectCategory: (categoryId: string, categoryType: 'foreground' | 'text') => void; // Global category selection function
  clearAllSelections: () => void; // Function to clear all category selections
  applyRemoteState: (state: RemoteCategoryState) => void; // Apply remote state without triggering broadcasts
  isRemoteUpdate: () => boolean; // Check if current update is from remote source
}

// Create the context with default values
const CategoryContext = createContext<CategoryContextType>({
  foregroundCategories: [],
  setForegroundCategories: () => {},
  textCategories: [],
  setTextCategories: () => {},
  selectedTextCategory: null,
  setSelectedTextCategory: () => {},
  selectedDates: new Map(),
  dateInfoMap: new Map(),
  setSelectedDate: () => {},
  getSelectedDateColor: () => null,
  toggleTextCategory: () => {},
  getDateTextCategories: () => [],
  generateCategorySymbol: () => '',
  selectCategory: () => {},
  clearAllSelections: () => {},
  applyRemoteState: () => {},
  isRemoteUpdate: () => false,
});

// Create a provider component
export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  // Ref to track if current state change is from a remote source
  // This is a ref (not state) to avoid React batching issues and provide synchronous access
  const isRemoteUpdateRef = useRef(false);
  
  // Ref to track pending remote updates - stays true until after React's batch rendering
  // This is more reliable than version counters because it uses requestAnimationFrame
  const pendingRemoteUpdateRef = useRef(false);
  
  // Track the previous foreground categories to detect actual color changes (not just loads)
  const prevForegroundCategoriesRef = useRef<Category[] | null>(null);
  
  // Initial category data
  const [foregroundCategories, setForegroundCategoriesInternal] = useState<Category[]>([
    { id: '1', label: 'Important', color: '#F44336', active: true, visible: true, selected: true },
    { id: '2', label: 'Work', color: '#2196F3', active: true, visible: true, selected: false },
    { id: '3', label: 'Personal', color: '#4CAF50', active: true, visible: true, selected: false }
  ]);

  // Wrapper for setForegroundCategories to track local changes
  const setForegroundCategories = useCallback((categories: Category[] | ((prev: Category[]) => Category[])) => {
    setForegroundCategoriesInternal(categories);
  }, []);

  // Initial text category data (sorted)
  const [internalTextCategories, setInternalTextCategories] = useState<TextCategory[]>(
    sortTextCategories([
      { id: 't1', label: 'Holiday', color: '#FF5722', active: true, visible: true, selected: false },
      { id: 't2', label: 'Deadline', color: '#795548', active: true, visible: true, selected: false }
    ])
  );
  
  // Wrapper for setTextCategories that ensures categories are always sorted
  const setTextCategories = useCallback((categories: TextCategory[] | ((prev: TextCategory[]) => TextCategory[])) => {
    if (typeof categories === 'function') {
      setInternalTextCategories(prev => sortTextCategories(categories(prev)));
    } else {
      setInternalTextCategories(sortTextCategories(categories));
    }
  }, []);
  
  // Expose sorted text categories
  const textCategories = internalTextCategories;
  
  // Currently selected text category for interaction
  const [selectedTextCategory, setSelectedTextCategory] = useState<TextCategory | null>(null);
  

  // Map to store date information with category associations
  const [dateInfoMap, setDateInfoMap] = useState<Map<string, DateInfo>>(new Map());
  
  // Map to store selected dates and their colors (for backward compatibility)
  const [selectedDates, setSelectedDates] = useState<Map<string, string>>(new Map());

  // Check if current update is from remote source (synchronous ref access)
  const isRemoteUpdate = useCallback(() => isRemoteUpdateRef.current, []);

  // Apply remote state atomically without triggering broadcasts
  // This function sets the remote flag, applies all state changes, then resets the flag
  const applyRemoteState = useCallback((state: RemoteCategoryState) => {
    console.log('CategoryContext: Applying remote state atomically');
    
    // Set the pending remote update flag - this will prevent the useEffect from processing
    // We use requestAnimationFrame to reset it after React's batch rendering completes
    pendingRemoteUpdateRef.current = true;
    
    // Set the remote update flag BEFORE any state changes
    isRemoteUpdateRef.current = true;
    
    // Apply foreground categories
    setForegroundCategoriesInternal(state.foregroundCategories);
    
    // Apply text categories (sorted) - preserve existing if not provided for backward compatibility
    if (state.textCategories && state.textCategories.length > 0) {
      setInternalTextCategories(sortTextCategories(state.textCategories));
    }
    // If textCategories is missing or empty, keep current text categories for transparency
    
    // Apply date info map - convert from array of tuples to Map
    const newDateInfoMap = new Map<string, DateInfo>();
    const newSelectedDates = new Map<string, string>();
    
    console.log('CategoryContext: Creating new dateInfoMap from state with', state.dateInfoMap.length, 'entries');
    
    state.dateInfoMap.forEach(([dateStr, info]) => {
      console.log('CategoryContext: Adding date info for', dateStr, 'with textCategoryIds:', info.textCategoryIds);
      newDateInfoMap.set(dateStr, {
        color: info.color,
        categoryId: info.categoryId,
        textCategoryIds: info.textCategoryIds
      });
      if (info.color) {
        newSelectedDates.set(dateStr, info.color);
      }
    });
    
    console.log('CategoryContext: Setting new dateInfoMap with', newDateInfoMap.size, 'entries');
    
    // Directly set the new maps - React will detect the change since they are new Map instances
    setDateInfoMap(newDateInfoMap);
    setSelectedDates(newSelectedDates);
    console.log('CategoryContext: dateInfoMap and selectedDates set');
    
    // Reset the remote update flag immediately
    isRemoteUpdateRef.current = false;
    
    // Reset the pending flag after React's batch rendering using requestAnimationFrame
    // This ensures the useEffect that runs due to these state changes will be skipped
    requestAnimationFrame(() => {
      pendingRemoteUpdateRef.current = false;
      console.log('CategoryContext: pendingRemoteUpdate flag reset after frame');
    });
  }, []);

  // Update selectedDates when category COLORS change (not when loaded from remote)
  useEffect(() => {
    console.log('CategoryContext useEffect triggered - pendingRemoteUpdate:', pendingRemoteUpdateRef.current);
    
    // Skip this effect if we're in a pending remote update
    // The pendingRemoteUpdateRef stays true until after React's batch rendering completes
    if (pendingRemoteUpdateRef.current) {
      console.log('Skipping category color sync - remote update in progress');
      // Update the ref so next time we can compare properly
      prevForegroundCategoriesRef.current = foregroundCategories;
      return;
    }
    
    // Only update if we have dates to update
    if (dateInfoMap.size === 0) {
      prevForegroundCategoriesRef.current = foregroundCategories;
      return;
    }
    
    // Check if any category colors actually changed (not just being set for the first time)
    const prevCategories = prevForegroundCategoriesRef.current;
    if (!prevCategories) {
      // First render, just store the categories and skip
      console.log('First render, skipping color sync');
      prevForegroundCategoriesRef.current = foregroundCategories;
      return;
    }
    
    // Check if any category color has actually changed
    let hasColorChange = false;
    for (const category of foregroundCategories) {
      const prevCategory = prevCategories.find(c => c.id === category.id);
      if (prevCategory && prevCategory.color !== category.color) {
        hasColorChange = true;
        console.log(`Category ${category.id} color changed from ${prevCategory.color} to ${category.color}`);
        break;
      }
    }
    
    // Update the ref for next comparison
    prevForegroundCategoriesRef.current = foregroundCategories;
    
    if (!hasColorChange) {
      console.log('No color changes detected, skipping sync');
      return;
    }
    
    console.log('Category colors changed, updating dates');
    console.log('Current dateInfoMap:', Array.from(dateInfoMap.entries()));
    console.log('Current foreground categories:', foregroundCategories);
    
    // Create a new map to avoid nested state updates
    const newSelectedDates = new Map<string, string>();
    const newDateInfoMap = new Map<string, DateInfo>();
    
    let hasChanges = false;
    
    // Check each date and update its color based on the category's current color
    dateInfoMap.forEach((dateInfo, dateStr) => {
      // Find the category in foreground categories
      const category = foregroundCategories.find(cat => cat.id === dateInfo.categoryId);
      
      if (category && category.color) {
        // Check if color has changed
        if (dateInfo.color !== category.color) {
          hasChanges = true;
        }
        
        // Update the color in both maps
        newSelectedDates.set(dateStr, category.color);
        newDateInfoMap.set(dateStr, { 
          color: category.color,
          categoryId: dateInfo.categoryId,
          // Preserve existing text categories
          textCategoryIds: dateInfo.textCategoryIds
        });
      } else {
        // If no matching category, preserve text categories if they exist
        if (dateInfo.textCategoryIds && dateInfo.textCategoryIds.length > 0) {
          newDateInfoMap.set(dateStr, {
            color: '',
            categoryId: '',
            textCategoryIds: dateInfo.textCategoryIds
          });
        }
        // Note: dates with no foreground category and no text categories will be removed from the map
      }
    });
    
    console.log('New selectedDates:', Array.from(newSelectedDates.entries()));
    console.log('New dateInfoMap:', Array.from(newDateInfoMap.entries()));
    console.log('Has changes:', hasChanges);
    
    // Always update to ensure changes are reflected
    setSelectedDates(newSelectedDates);
    setDateInfoMap(newDateInfoMap);
    
  }, [foregroundCategories]); // Only depend on foregroundCategories

  // Update selected text category when textCategories change
  useEffect(() => {
    console.log('Text categories updated:', textCategories);
    const selectedCat = textCategories.find(cat => cat.selected);
    console.log('Selected text category:', selectedCat);
    setSelectedTextCategory(selectedCat || null);
  }, [textCategories]);

  // Function to set or unset a date's color
  const setSelectedDate = (dateStr: string, color: string | null, categoryId: string | null = null) => {
    console.log('Setting date:', dateStr, 'color:', color, 'categoryId:', categoryId);
    
    // Update dateInfoMap
    setDateInfoMap(prev => {
      const newMap = new Map(prev);
      if (color && categoryId) {
        // Get existing date info to preserve text categories
        const existingInfo = prev.get(dateStr);
        newMap.set(dateStr, { 
          color, 
          categoryId,
          // Preserve existing textCategoryIds when updating foreground color/category
          textCategoryIds: existingInfo?.textCategoryIds
        });
      } else {
        // When removing foreground color, preserve text categories if they exist
        const existingInfo = prev.get(dateStr);
        if (existingInfo?.textCategoryIds && existingInfo.textCategoryIds.length > 0) {
          // Keep the date with empty color/categoryId but preserve text categories
          newMap.set(dateStr, {
            color: '',
            categoryId: '',
            textCategoryIds: existingInfo.textCategoryIds
          });
        } else {
          // No text categories, safe to delete completely
          newMap.delete(dateStr);
        }
      }
      return newMap;
    });

    // Update selectedDates for backward compatibility
    setSelectedDates(prev => {
      const newMap = new Map(prev);
      if (color) {
        newMap.set(dateStr, color);
      } else {
        // Only remove from selectedDates if there are no text categories
        const dateInfo = dateInfoMap.get(dateStr);
        if (!dateInfo?.textCategoryIds || dateInfo.textCategoryIds.length === 0) {
          newMap.delete(dateStr);
        }
      }
      return newMap;
    });
  };

  // Function to get a date's color
  const getSelectedDateColor = (dateStr: string): string | null => {
    // First try to get it from the dateInfoMap
    const dateInfo = dateInfoMap.get(dateStr);
    if (dateInfo && dateInfo.color) {
      return dateInfo.color;
    }
    // Fall back to selectedDates for backward compatibility
    return selectedDates.get(dateStr) || null;
  };

  // Function to toggle text category on/off for a date
  const toggleTextCategory = (dateStr: string, categoryId: string) => {
    console.log('toggleTextCategory called:', dateStr, 'categoryId:', categoryId);
    
    setDateInfoMap(prev => {
      const newMap = new Map(prev);
      const currentInfo = newMap.get(dateStr) || { color: '', categoryId: '' };
      const currentTextCategories = currentInfo.textCategoryIds || [];
      
      console.log('Current dateInfo for', dateStr, ':', currentInfo);
      console.log('Current text categories:', currentTextCategories);
      
      // Check if category is already assigned to this date
      const categoryIndex = currentTextCategories.indexOf(categoryId);
      let updatedTextCategories: string[];
      
      if (categoryIndex > -1) {
        // Remove category
        updatedTextCategories = currentTextCategories.filter(id => id !== categoryId);
        console.log('Removing text category, new list:', updatedTextCategories);
      } else {
        // Add category
        updatedTextCategories = [...currentTextCategories, categoryId];
        console.log('Adding text category, new list:', updatedTextCategories);
      }
      
      // Update the date info
      if (updatedTextCategories.length > 0 || currentInfo.color) {
        const newDateInfo = {
          ...currentInfo,
          textCategoryIds: updatedTextCategories.length > 0 ? updatedTextCategories : undefined
        };
        console.log('Setting new dateInfo for', dateStr, ':', newDateInfo);
        newMap.set(dateStr, newDateInfo);
      } else {
        // If no text categories and no color category, remove the entry
        console.log('Removing dateInfo entry for', dateStr);
        newMap.delete(dateStr);
      }
      
      console.log('Updated dateInfoMap size:', newMap.size);
      return newMap;
    });
  };

  // Function to get text categories for a date
  const getDateTextCategories = (dateStr: string): TextCategory[] => {
    const dateInfo = dateInfoMap.get(dateStr);
    if (!dateInfo || !dateInfo.textCategoryIds) {
      return [];
    }
    
    const categories = dateInfo.textCategoryIds
      .map(id => textCategories.find(cat => cat.id === id))
      .filter(cat => cat !== undefined) as TextCategory[];
    
    // Sort by category ID to ensure consistent order
    return sortTextCategories(categories);
  };

  // Function to generate symbol from category label
  const generateCategorySymbol = (label: string): string => {
    return generateSymbol(label);
  };

  // Global category selection - ensures only one category is selected across all types
  const selectCategory = (categoryId: string, categoryType: 'foreground' | 'text') => {
    console.log(`Selecting ${categoryType} category:`, categoryId);
    
    if (categoryType === 'foreground') {
      // Deselect all text categories and select the foreground category
      setTextCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
      setForegroundCategories(prev => prev.map(cat => ({ ...cat, selected: cat.id === categoryId })));
    } else {
      // Deselect all foreground categories and select the text category
      setForegroundCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
      setTextCategories(prev => prev.map(cat => ({ ...cat, selected: cat.id === categoryId })));
    }
  };

  // Clear all category selections
  const clearAllSelections = () => {
    console.log('Clearing all category selections');
    setForegroundCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
    setTextCategories(prev => prev.map(cat => ({ ...cat, selected: false })));
  };

  return (
    <CategoryContext.Provider
      value={{
        foregroundCategories,
        setForegroundCategories,
        textCategories,
        setTextCategories,
        selectedTextCategory,
        setSelectedTextCategory,
        selectedDates,
        dateInfoMap,
        setSelectedDate,
        getSelectedDateColor,
        toggleTextCategory,
        getDateTextCategories,
        generateCategorySymbol,
        selectCategory,
        clearAllSelections,
        applyRemoteState,
        isRemoteUpdate,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

// Custom hook to use the category context
export const useCategories = () => useContext(CategoryContext);
