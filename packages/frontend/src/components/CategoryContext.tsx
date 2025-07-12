import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Import the Category type from Categories component
import { Category } from './Categories';

// Interface to store date information
interface DateInfo {
  color: string;
  categoryId: string; // Store which category this date is associated with
}

interface CategoryContextType {
  foregroundCategories: Category[];
  setForegroundCategories: (categories: Category[]) => void;
  backgroundCategories: Category[];
  setBackgroundCategories: (categories: Category[]) => void;
  tagCategories: Category[];
  setTagCategories: (categories: Category[]) => void;
  selectedDates: Map<string, string>; // Map of date strings to color strings (for backward compatibility)
  dateInfoMap: Map<string, DateInfo>; // Map of date strings to DateInfo objects
  setSelectedDate: (dateStr: string, color: string | null, categoryId?: string | null) => void; // Function to set/unset a date's color
  getSelectedDateColor: (dateStr: string) => string | null; // Function to get a date's color
}

// Create the context with default values
const CategoryContext = createContext<CategoryContextType>({
  foregroundCategories: [],
  setForegroundCategories: () => {},
  backgroundCategories: [],
  setBackgroundCategories: () => {},
  tagCategories: [],
  setTagCategories: () => {},
  selectedDates: new Map(),
  dateInfoMap: new Map(),
  setSelectedDate: () => {},
  getSelectedDateColor: () => null,
});

// Create a provider component
export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  // Initial category data
  const [foregroundCategories, setForegroundCategories] = useState<Category[]>([
    { id: '1', label: 'Important', color: '#F44336', active: true, selected: true },
    { id: '2', label: 'Work', color: '#2196F3', active: true, selected: false },
    { id: '3', label: 'Personal', color: '#4CAF50', active: true, selected: false }
  ]);
  
  const [backgroundCategories, setBackgroundCategories] = useState<Category[]>([
    { id: '1', label: 'Urgent', color: '#E91E63', active: true },
    { id: '2', label: 'Waiting', color: '#FF9800', active: true }
  ]);
  
  const [tagCategories, setTagCategories] = useState<Category[]>([
    { id: '1', label: 'Home', color: null, active: true },
    { id: '2', label: 'Office', color: null, active: true },
    { id: '3', label: 'Travel', color: null, active: true },
    { id: '4', label: 'Call', color: null, active: false }
  ]);

  // Map to store date information with category associations
  const [dateInfoMap, setDateInfoMap] = useState<Map<string, DateInfo>>(new Map());
  
  // Map to store selected dates and their colors (for backward compatibility)
  const [selectedDates, setSelectedDates] = useState<Map<string, string>>(new Map());

  // Update selectedDates when categories change to reflect new colors
  useEffect(() => {
    // Only update if we have dates to update
    if (dateInfoMap.size === 0) return;
    
    console.log('Categories changed, updating dates');
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
          categoryId: dateInfo.categoryId
        });
      }
    });
    
    console.log('New selectedDates:', Array.from(newSelectedDates.entries()));
    console.log('New dateInfoMap:', Array.from(newDateInfoMap.entries()));
    console.log('Has changes:', hasChanges);
    
    // Always update to ensure changes are reflected
    setSelectedDates(newSelectedDates);
    setDateInfoMap(newDateInfoMap);
    
  }, [foregroundCategories]); // Only depend on foregroundCategories

  // Function to set or unset a date's color
  const setSelectedDate = (dateStr: string, color: string | null, categoryId: string | null = null) => {
    console.log('Setting date:', dateStr, 'color:', color, 'categoryId:', categoryId);
    
    // Update dateInfoMap
    setDateInfoMap(prev => {
      const newMap = new Map(prev);
      if (color && categoryId) {
        newMap.set(dateStr, { color, categoryId });
      } else {
        newMap.delete(dateStr);
      }
      return newMap;
    });

    // Update selectedDates for backward compatibility
    setSelectedDates(prev => {
      const newMap = new Map(prev);
      if (color) {
        newMap.set(dateStr, color);
      } else {
        newMap.delete(dateStr);
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

  return (
    <CategoryContext.Provider
      value={{
        foregroundCategories,
        setForegroundCategories,
        backgroundCategories,
        setBackgroundCategories,
        tagCategories,
        setTagCategories,
        selectedDates,
        dateInfoMap,
        setSelectedDate,
        getSelectedDateColor,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

// Custom hook to use the category context
export const useCategories = () => useContext(CategoryContext);
