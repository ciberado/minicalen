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
  initialColor?: string;
  initialActive?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  onColorChange?: (id: string, newColor: string) => void;
  onActiveChange?: (id: string, isActive: boolean) => void;
}

const CategoryValue = ({
  id,
  initialLabel = 'Category',
  initialColor = DEFAULT_COLORS[0],
  initialActive = true,
  onLabelChange,
  onColorChange,
  onActiveChange
}: CategoryValueProps) => {
  const [label, setLabel] = useState(initialLabel);
  const [color, setColor] = useState(initialColor);
  const [active, setActive] = useState(initialActive);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Update internal state if props change
  useEffect(() => {
    setLabel(initialLabel);
    setColor(initialColor);
    setActive(initialActive);
  }, [initialLabel, initialColor, initialActive]);

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
    setActive(e.target.checked);
    if (onActiveChange) {
      onActiveChange(id, e.target.checked);
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
        borderColor: 'divider',
        backgroundColor: active ? 'background.paper' : 'action.disabledBackground',
        opacity: active ? 1 : 0.7,
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
        },
        my: 1,
      }}
    >
      {/* Color square */}
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
              backgroundColor: color,
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

      {/* Color selection menu */}
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

      {/* Editable label */}
      <Box sx={{ flexGrow: 1 }}>
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
            sx={{ 
              cursor: 'text',
              py: 1,
              px: 0.5,
              borderRadius: 1,
              '&:hover': { 
                backgroundColor: 'action.hover' 
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

      {/* Activation checkbox */}
      <Checkbox
        checked={active}
        onChange={handleCheckboxChange}
        size="small"
        sx={{ p: 0.5 }}
      />
    </Box>
  );
};

export default CategoryValue;
