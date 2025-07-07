import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface GlobalExclusiveContextType {
  selectedCategory: { categoryId: string, componentId: string } | null;
  selectCategory: (categoryId: string, componentId: string) => void;
  clearSelection: (categoryId: string, componentId: string) => void;
  registerComponent: (componentId: string) => void;
  unregisterComponent: (componentId: string) => void;
}

const GlobalExclusiveContext = createContext<GlobalExclusiveContextType | null>(null);

export const useGlobalExclusive = (): GlobalExclusiveContextType => {
  const context = useContext(GlobalExclusiveContext);
  if (!context) {
    throw new Error('useGlobalExclusive must be used within a GlobalExclusiveProvider');
  }
  return context;
};

interface GlobalExclusiveProviderProps {
  children: ReactNode;
}

export const GlobalExclusiveProvider: React.FC<GlobalExclusiveProviderProps> = ({ children }) => {
  const [selectedCategory, setSelectedCategory] = useState<{ categoryId: string, componentId: string } | null>(null);
  const [, setRegisteredComponents] = useState<Set<string>>(new Set());

  // Debug log when the selected category changes
  useEffect(() => {
    if (selectedCategory) {
      console.log('[GlobalExclusive] Selected category changed:', {
        categoryId: selectedCategory.categoryId,
        componentId: selectedCategory.componentId
      });
    } else {
      console.log('[GlobalExclusive] No category selected');
    }
  }, [selectedCategory]);

  const selectCategory = (categoryId: string, componentId: string) => {
    console.log(`[GlobalExclusive] Setting selected category: ${categoryId} in component: ${componentId}`);
    
    // If we're selecting the same category that's already selected, do nothing
    if (selectedCategory && 
        selectedCategory.categoryId === categoryId && 
        selectedCategory.componentId === componentId) {
      return;
    }
    
    setSelectedCategory({ categoryId, componentId });
  };
  
  // Add method to clear selection if needed
  const clearSelection = (categoryId: string, componentId: string) => {
    console.log(`[GlobalExclusive] Clearing selection for category: ${categoryId} in component: ${componentId}`);
    
    // Only clear if this component/category is the currently selected one
    if (selectedCategory && 
        selectedCategory.componentId === componentId && 
        selectedCategory.categoryId === categoryId) {
      setSelectedCategory(null);
    }
  };

  const registerComponent = (componentId: string) => {
    setRegisteredComponents(prev => {
      const newSet = new Set(prev);
      newSet.add(componentId);
      return newSet;
    });
  };

  const unregisterComponent = (componentId: string) => {
    setRegisteredComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentId);
      return newSet;
    });
    
    // Clear selection if the component being unregistered had the selection
    if (selectedCategory && selectedCategory.componentId === componentId) {
      setSelectedCategory(null);
    }
  };

  return (
    <GlobalExclusiveContext.Provider value={{ 
      selectedCategory, 
      selectCategory,
      clearSelection,
      registerComponent, 
      unregisterComponent 
    }}>
      {children}
    </GlobalExclusiveContext.Provider>
  );
};
