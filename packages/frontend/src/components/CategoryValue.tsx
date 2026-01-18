import { useState, useEffect } from 'react';
import { 
  Box, 
  Checkbox, 
  TextField, 
  ClickAwayListener,
  Tooltip, 
  IconButton,
  Menu,
  Paper
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';

// Default color palette - ten distinct colors
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

interface CategoryValueProps {
  id: string;
  initialLabel?: string;
  initialColor?: string | null;  // Make color optional by allowing null
  initialActive?: boolean;
  initialVisible?: boolean;  // Add visible state
  initialSelected?: boolean;  // Add selected state
  onLabelChange?: (id: string, newLabel: string) => void;
  onColorChange?: (id: string, newColor: string | null) => void;
  onActiveChange?: (id: string, isActive: boolean) => void;
  onVisibleChange?: (id: string, isVisible: boolean) => void;  // Add visibility handler
  onSelectedChange?: (id: string, isSelected: boolean) => void;  // Add selection handler
  showColorPicker?: boolean;  // Add option to hide color picker
}

const CategoryValue = ({
  id,
  initialLabel = 'Category',
  initialColor = DEFAULT_COLORS[0],
  initialActive = true,
  initialVisible = true,  // Add visible prop with default true
  initialSelected = false,  // Add selected prop with default false
  onLabelChange,
  onColorChange,
  onActiveChange,
  onVisibleChange,  // Add visibility handler
  onSelectedChange,  // Add selection handler
  showColorPicker = true
}: CategoryValueProps) => {
  const [label, setLabel] = useState(initialLabel);
  const [color, setColor] = useState(initialColor);
  const [active, setActive] = useState(initialActive);
  const [visible, setVisible] = useState(initialVisible);  // Add visible state
  const [selected, setSelected] = useState(initialSelected);  // Add selected state
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Update internal state if props change
  useEffect(() => {
    setLabel(initialLabel);
    setColor(initialColor);
    setActive(initialActive);
    setVisible(initialVisible);
    setSelected(initialSelected);
  }, [initialLabel, initialColor, initialActive, initialVisible, initialSelected]);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (newColor: string) => {
    setColor(newColor);
    handleColorClose();
    if (onColorChange) {
      onColorChange(id, newColor);
    }
  };

  const handleLabelClick = () => {
    // Single click toggles selection
    const newSelected = !selected;
    setSelected(newSelected);
    if (onSelectedChange) {
      console.log('Setting selection for category', id, 'to', newSelected);
      onSelectedChange(id, newSelected);
    }
  };
  
  const handleLabelDoubleClick = () => {
    setIsEditing(true);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const handleLabelBlur = () => {
    setIsEditing(false);
    if (onLabelChange) {
      onLabelChange(id, label);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    console.log('Category checkbox changed:', id, label, 'checked:', isChecked);
    
    // Update both visible and active states to keep them in sync
    setVisible(isChecked);
    setActive(isChecked);
    
    // Call both handlers to ensure parent components receive both updates
    if (onVisibleChange) {
      onVisibleChange(id, isChecked);
    }
    if (onActiveChange) {
      onActiveChange(id, isChecked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (onLabelChange) {
        onLabelChange(id, label);
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 0.75,
        borderRadius: 1,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: active 
          ? (selected ? 'rgba(25, 118, 210, 0.12)' : 'background.paper') 
          : 'action.disabledBackground',
        opacity: active ? 1 : 0.2,
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: active && !selected ? 'rgba(25, 118, 210, 0.04)' : undefined,
        },
        my: 1,
      }}
    >
      {/* Color square - only show if showColorPicker is true */}
      {showColorPicker && (
        <Tooltip title="Change color">
          <IconButton 
            size="small" 
            onClick={handleColorClick}
            sx={{ 
              mr: 1,
              p: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box 
              sx={{ 
                width: 24, 
                height: 24, 
                backgroundColor: color || 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PaletteIcon 
                fontSize="small" 
                sx={{ 
                  opacity: 0, 
                  transition: 'opacity 0.2s',
                  color: 'white',
                  '&:hover': { opacity: 0.8 } 
                }} 
              />
            </Box>
          </IconButton>
        </Tooltip>
      )}

      {/* Color selection menu - only show if showColorPicker is true */}
      {showColorPicker && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleColorClose}
        >
          <Paper sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', width: 120 }}>
              {DEFAULT_COLORS.map((colorOption) => (
                <Box 
                  key={colorOption}
                  onClick={() => handleColorSelect(colorOption)}
                  sx={{
                    width: 24,
                    height: 24,
                    m: 0.5,
                    backgroundColor: colorOption,
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: color === colorOption ? '2px solid black' : '1px solid #ddd',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Menu>
      )}

      {/* Editable label */}
      <Box sx={{ flexGrow: 1, ml: showColorPicker ? 0 : 1 }}>
        {isEditing ? (
          <ClickAwayListener onClickAway={handleLabelBlur}>
            <TextField
              size="small"
              value={label}
              onChange={handleLabelChange}
              onKeyDown={handleKeyDown}
              autoFocus
              fullWidth
              variant="standard"
              InputProps={{
                sx: { 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }
              }}
            />
          </ClickAwayListener>
        ) : (
          <Box 
            onClick={handleLabelClick}
            onDoubleClick={handleLabelDoubleClick}
            sx={{ 
              cursor: 'text',
              py: 1,
              px: 0.5,
              borderRadius: 1,
              '&:hover': { 
                backgroundColor: 'action.hover',
                // Show dotted underline on hover to indicate editability
                textDecoration: 'underline dotted'
              },
              color: active ? 'text.primary' : 'text.disabled',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            {label}
          </Box>
        )}
      </Box>

      {/* Visibility checkbox */}
      <Checkbox
        checked={visible}
        onChange={handleCheckboxChange}
        size="small"
        sx={{ p: 0.5 }}
      />
    </Box>
  );
};

export default CategoryValue;
