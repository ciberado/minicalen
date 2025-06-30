import { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Categories, { Category } from './Categories';

const CategoriesExample = () => {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', label: 'Project A', color: '#3F51B5', active: true },
    { id: '2', label: 'Project B', color: '#009688', active: true },
    { id: '3', label: 'Project C', color: '#FF9800', active: false }
  ]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Categories Example
      </Typography>
      <Typography paragraph>
        This example shows how to use the Categories component with external state management.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ width: 250 }}>
          <Categories 
            title="Managed Categories" 
            categories={categories} 
            onCategoriesChange={setCategories} 
          />
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Active Categories:
          </Typography>
          <ul>
            {categories
              .filter(cat => cat.active)
              .map(cat => (
                <li key={cat.id} style={{ color: cat.color }}>
                  {cat.label}
                </li>
              ))
            }
          </ul>
        </Box>
      </Box>
    </Paper>
  );
};

export default CategoriesExample;
