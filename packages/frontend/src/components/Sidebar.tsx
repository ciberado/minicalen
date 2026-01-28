import { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AccountCircle,
  Login,
  Logout,
  FolderOpen,
} from '@mui/icons-material';
import Categories, { CategoriesHandle } from './Categories';
import { useCategories, TextCategory } from './CategoryContext';
import SaveButton from './SaveButton';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../auth/client';
import logger from '../logger';

interface SidebarProps {
  width: string;
  onOpenSessions?: () => void;
}

const Sidebar = ({ width, onOpenSessions }: SidebarProps) => {
  const { user, isAuthenticated, setShowAuthDialog } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
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
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignIn = () => {
    handleMenuClose();
    setShowAuthDialog(true);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    try {
      await signOut();
      logger.info('Signed out successfully');
    } catch (error) {
      logger.error('Sign out error:', error);
    }
  };

  const handleOpenSessions = () => {
    handleMenuClose();
    if (onOpenSessions) {
      onOpenSessions();
    }
  };  
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
          <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
            {isAuthenticated ? (
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircle />
            )}
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {isAuthenticated ? (
            [
              <MenuItem key="sessions" onClick={handleOpenSessions}>
                <ListItemIcon>
                  <FolderOpen fontSize="small" />
                </ListItemIcon>
                <ListItemText>My Calendars</ListItemText>
              </MenuItem>,
              <MenuItem key="signout" onClick={handleSignOut}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Sign Out</ListItemText>
              </MenuItem>,
            ]
          ) : (
            <MenuItem onClick={handleSignIn}>
              <ListItemIcon>
                <Login fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign In</ListItemText>
            </MenuItem>
          )}
        </Menu>
        
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
              const cleanCategories: TextCategory[] = updatedCategories.map(cat => {
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
                  color: cat.color || '#000000', // Ensure color is never null
                  label: cat.label.replace(/ \[.*\]$/, '')
                } as TextCategory;
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
