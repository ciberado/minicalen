import { useRef, useEffect, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction'; // Import the interaction plugin
import './Calendar.css'; // Import custom calendar styles
import './noBorders.css'; // Import border removal styles
import { useCategories } from './CategoryContext'; // Import our context

// Utility function to convert hex color to RGB values
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

interface CalendarProps {
  // Add any props you might need in the future
}

const Calendar = ({}: CalendarProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [monthCount] = useState(12); // Always 12 months
  const [aspectRatio, setAspectRatio] = useState(1.5); // Starting aspect ratio
  
  // Get the categories context
  const { 
    foregroundCategories, 
    textCategories,
    selectedDates,
    dateInfoMap,
    setSelectedDate,
    toggleTextCategory,
    getDateTextCategories,
    generateCategorySymbol
  } = useCategories();
  
  // Get the currently selected foreground category (if any)
  const selectedForegroundCategory = useMemo(() => {
    return foregroundCategories.find(cat => cat.selected === true);
  }, [foregroundCategories]);
  
  // Get the currently selected text category (if any)
  const selectedTextCategory = useMemo(() => {
    return textCategories.find(cat => cat.selected === true);
  }, [textCategories]);

  // Function to update symbols for a specific date without full re-render
  const updateDateSymbols = (dateStr: string) => {
    // Find ALL calendar cells for this date (there may be multiple for cross-month dates)
    const cellElements = document.querySelectorAll(`[data-date="${dateStr}"]`);
    if (cellElements.length === 0) return;

    const dateInfo = dateInfoMap.get(dateStr);
    
    // Process each cell element that has this date
    cellElements.forEach((cellElement) => {
      // Remove existing symbols
      const existingOverlay = cellElement.querySelector('.text-symbols-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      // Add new symbols if any
      if (dateInfo && dateInfo.textCategoryIds && dateInfo.textCategoryIds.length > 0) {
        const textCats = getDateTextCategories(dateStr);
        
        if (textCats.length > 0) {
          const symbolsContainer = document.createElement('div');
          symbolsContainer.className = 'text-symbols-overlay';
          symbolsContainer.style.cssText = `
            position: absolute;
            top: 18px;
            left: 2px;
            right: 2px;
            pointer-events: none;
            z-index: 3;
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
          `;
          
          textCats.forEach(cat => {
            const symbol = generateCategorySymbol(cat.label);
            
            // Determine opacity based on category visibility
            const opacity = cat.visible === false ? 0.1 : 1;
            
            const symbolSpan = document.createElement('span');
            symbolSpan.textContent = symbol;
            symbolSpan.style.cssText = `
              color: ${cat.color};
              font-weight: bold;
              font-size: 10px;
              background: rgba(255, 255, 255, 0.8);
              padding: 1px 2px;
              border-radius: 2px;
              border: 1px solid ${cat.color};
              line-height: 1;
              opacity: ${opacity};
            `;
            symbolsContainer.appendChild(symbolSpan);
          });
          
          (cellElement as HTMLElement).style.position = 'relative';
          cellElement.appendChild(symbolsContainer);
        }
      }
    });
  };
  
  // Convert selectedDates Map to FullCalendar events
  const events = useMemo(() => {
    const eventArray: any[] = [];
    
    // Convert each date entry to background events for color categories
    selectedDates.forEach((color, dateStr) => {
      if (color) {
        // Get the date info to determine the category
        const dateInfo = dateInfoMap.get(dateStr);
        
        // Check if the corresponding category is visible/active for opacity
        let eventBackgroundColor = color;
        if (dateInfo && dateInfo.categoryId) {
          const category = foregroundCategories.find(cat => cat.id === dateInfo.categoryId);
          // Reduce opacity if the category is inactive or invisible
          if (category && (category.visible === false || category.active === false)) {
            console.log('Category inactive, applying reduced opacity:', category.label, category.active, category.visible);
            // Convert color to rgba with 20% opacity
            const rgb = hexToRgb(color);
            if (rgb) {
              eventBackgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
            }
          } else {
            console.log('Category active:', category?.label, category?.active, category?.visible);
          }
        }
        
        // Add the event with appropriate background color
        eventArray.push({
          id: `bg-${dateStr}`,
          start: dateStr,
          allDay: true,
          display: 'background',
          backgroundColor: eventBackgroundColor,
          classNames: ['non-interactive-event'] // Add class to make non-interactive
        });
      }
    });
    
    return eventArray;
  }, [selectedDates, dateInfoMap, foregroundCategories]);

  // Force calendar to refresh when dates change
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  }, [selectedDates]);

  // Force calendar to refresh when category visibility changes
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
    // Also update text symbols when text categories visibility changes
    const timeoutId = setTimeout(() => {
      dateInfoMap.forEach((_, dateStr) => {
        updateDateSymbols(dateStr);
      });
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, [foregroundCategories, textCategories]); // Refresh when any category visibility changes

  // Track dates that have had symbols to ensure cleanup on removal
  const [trackedDates, setTrackedDates] = useState(new Set<string>());

  // Update all date symbols when dateInfoMap changes (more efficient than full re-render)
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const currentDates = new Set<string>();
      
      // Update all current dates with symbols
      dateInfoMap.forEach((_, dateStr) => {
        updateDateSymbols(dateStr);
        currentDates.add(dateStr);
      });
      
      // Clean up symbols for dates that were removed
      trackedDates.forEach((dateStr) => {
        if (!currentDates.has(dateStr)) {
          updateDateSymbols(dateStr); // This will clear symbols since date is not in map
        }
      });
      
      setTrackedDates(currentDates);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [dateInfoMap, trackedDates]);

  // Force 4 columns layout after render
  useEffect(() => {
    const applyFourColumnLayout = () => {
      // Force the correct layout via direct DOM manipulation if needed
      const fcMultimonth = document.querySelector('.fc-multimonth');
      
      if (fcMultimonth) {
        // Force the multimonth container to use grid layout
        (fcMultimonth as HTMLElement).style.display = 'grid';
        (fcMultimonth as HTMLElement).style.gridTemplateColumns = 'repeat(4, 1fr)';
        (fcMultimonth as HTMLElement).style.gridAutoRows = 'auto';
        (fcMultimonth as HTMLElement).style.width = '100%';
        
        // Apply styles to each month to ensure equal width
        const months = document.querySelectorAll('.fc-multimonth-month');
        months.forEach((month) => {
          (month as HTMLElement).style.width = 'auto';
          (month as HTMLElement).style.margin = '8px';
          (month as HTMLElement).style.minWidth = '0';
        });
      }
      
      // Adjust aspect ratio based on container size for best fit
      const container = document.querySelector('.fc');
      if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const newAspectRatio = containerWidth / (containerHeight *0.9);
        
        // Limit to reasonable range while favoring width to ensure 4 columns
        setAspectRatio(Math.max(1.2, Math.min(newAspectRatio, 2.0)));
      }
    };

    // Apply layout after initial render and on resize
    applyFourColumnLayout();
    window.addEventListener('resize', applyFourColumnLayout);
    
    // Also apply after a slight delay to ensure calendar is fully rendered
    const layoutTimer = setTimeout(applyFourColumnLayout, 200);
    
    return () => {
      window.removeEventListener('resize', applyFourColumnLayout);
      clearTimeout(layoutTimer);
    };
  }, []);

  // Utility function to get consistent date string
  const getDateStr = (date: Date) => {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date clicks
  const handleDateClick = (arg: any) => {
    const dateStr = getDateStr(arg.date); // Consistent date formatting
    
    console.log('Date clicked:', dateStr);
    console.log('Selected text category:', selectedTextCategory);
    console.log('Selected foreground category:', selectedForegroundCategory);
    
    // With global exclusivity, only one type of category can be selected at a time
    if (selectedTextCategory) {
      console.log('Text category selected, toggling:', selectedTextCategory.label);
      toggleTextCategory(dateStr, selectedTextCategory.id);
      
      // Immediately update the visual symbols for this specific date
      updateDateSymbols(dateStr);
    } else if (selectedForegroundCategory && selectedForegroundCategory.color) {
      // Check if the selected category is active - prevent interaction if not
      if (!selectedForegroundCategory.active) {
        console.log('Selected foreground category is inactive, ignoring click:', selectedForegroundCategory.label);
        return;
      }
      
      console.log('Foreground category selected, applying color:', selectedForegroundCategory.label);
      
      // Get the current information about the date
      const currentColor = selectedDates.get(dateStr);
      const dateInfo = dateInfoMap.get(dateStr);
      const currentCategoryId = dateInfo ? dateInfo.categoryId : null;
      
      console.log('Current color:', currentColor);
      console.log('Current category ID:', currentCategoryId);
      console.log('Selected category ID:', selectedForegroundCategory.id);
      
      // If the date is already marked with the same category that's currently selected,
      // remove the color (toggle behavior)
      if (currentCategoryId === selectedForegroundCategory.id) {
        console.log('Removing color - same category clicked again');
        setSelectedDate(dateStr, null, null); // Remove the date
      } else {
        console.log('Adding color:', selectedForegroundCategory.color);
        // Add/update the date with both color and category ID
        setSelectedDate(dateStr, selectedForegroundCategory.color, selectedForegroundCategory.id);
      }
      
      // Force calendar to refresh
      if (calendarRef.current) {
        setTimeout(() => {
          calendarRef.current?.getApi().refetchEvents();
        }, 0);
      }
    } else {
      // If no categories are selected at all, log this
      console.log('No category selected for date click');
    }
  };

  // Custom day cell renderer for text symbols
  const dayCellDidMount = (info: any) => {
    // Get date string in consistent format
    const dateStr = getDateStr(info.date);
    const dateInfo = dateInfoMap.get(dateStr);
    
    // Store reference to this cell for later updates
    info.el.setAttribute('data-date', dateStr);
    
    console.log('dayCellDidMount called for date:', dateStr, 'dateInfo:', dateInfo);
    
    if (dateInfo && dateInfo.textCategoryIds && dateInfo.textCategoryIds.length > 0) {
      const textCats = getDateTextCategories(dateStr);
      console.log('Found text categories for', dateStr, ':', textCats);
      
      if (textCats.length > 0) {
        // Remove any existing symbols overlay first
        const existingOverlay = info.el.querySelector('.text-symbols-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        // Create text symbols container
        const symbolsContainer = document.createElement('div');
        symbolsContainer.className = 'text-symbols-overlay';
        symbolsContainer.style.cssText = `
          position: absolute;
          top: 18px;
          left: 2px;
          right: 2px;
          pointer-events: none;
          z-index: 3;
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        `;
        
        // Add each symbol
        textCats.forEach(cat => {
          const symbol = generateCategorySymbol(cat.label);
          console.log('Adding symbol:', symbol, 'for category:', cat.label, 'color:', cat.color, 'visible:', cat.visible);
          
          // Determine opacity based on category visibility
          const opacity = cat.visible === false ? 0.1 : 1;
          
          const symbolSpan = document.createElement('span');
          symbolSpan.textContent = symbol;
          symbolSpan.style.cssText = `
            color: ${cat.color};
            font-weight: bold;
            font-size: 0.7rem;
            background: white;
            padding: 0px 2px;
            border-radius: 2px;
            box-shadow: 0 0 2px rgba(0,0,0,0.3);
            line-height: 1;
            opacity: ${opacity};
          `;
          symbolsContainer.appendChild(symbolSpan);
        });
        
        // Add the symbols to the day cell
        info.el.style.position = 'relative';
        info.el.appendChild(symbolsContainer);
        console.log('Added symbols overlay to', dateStr);
      }
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      '.fc': { // Target all FullCalendar elements
        height: '100% !important',
        width: '100% !important',
        fontFamily: 'inherit',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '8px', // Add some padding around the calendar
        '& .fc-theme-standard .fc-scrollgrid, & .fc-theme-standard td, & .fc-theme-standard th': {
          border: 'none !important', // Remove all borders
        },
        '& .fc-scrollgrid': {
          borderRadius: 0,
          border: 'none !important',
        },
      },
      '.fc .fc-toolbar': {
        marginBottom: '8px',
      },
      '.fc .fc-multimonth': { // Target FullCalendar's multimonth container
        height: 'auto !important',
        width: '100% !important',
        overflowY: 'hidden', // Prevent scrolling
        maxWidth: 'none !important', // Ensure it can expand to full width
        display: 'grid !important', // Use CSS grid for layout
        gridTemplateColumns: 'repeat(4, 1fr) !important', // Force 4 columns
        gap: '4px !important', // Add gap between grid items
      },
      '.fc .fc-multimonth-row': { // Target month rows
        display: 'contents !important', // Let grid layout handle the rows
      },
      '.fc .fc-multimonth-month': { // Target each month
        margin: '4px !important',
        padding: '4px !important',
        minWidth: '0 !important', // Allow shrinking
        width: 'auto !important',
        boxSizing: 'border-box !important',
        // Border removed
        boxShadow: '0 0 8px rgba(0, 0, 0, 0.08)', // Subtle shadow for separation
      },
      '.fc .fc-multimonth-monthheader': {
        padding: '2px 0',
        fontSize: '0.9rem',
        fontWeight: 'bold',
      },
      '.fc .fc-daygrid-day-top': {
        justifyContent: 'center', // Center day numbers
        fontSize: '0.8rem',
      },
      '.fc .fc-daygrid-day': {
        minHeight: '1.2em', // Make day cells smaller in height
        padding: '0 !important',
        border: 'none !important',
        cursor: 'pointer !important',
      },
      '.fc .fc-col-header-cell': {
        padding: '2px 0',
        fontSize: '0.75rem',
        border: 'none !important',
      },
      '.fc .fc-day-today': { // Highlight today
        backgroundColor: 'rgba(25, 118, 210, 0.04)',
        borderRadius: '0',
      },
      // Remove all table borders
      '.fc table, .fc tr, .fc td, .fc th': {
        border: 'none !important',
      },
      // Hover effect for days
      '.fc .fc-daygrid-day:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
      },
      // Ensure day numbers are above the click overlay
      '.fc .fc-daygrid-day-number': {
        position: 'relative',
        zIndex: 2,
        pointerEvents: 'none',
      },
      // Make background events non-interactive
      '.fc .non-interactive-event': {
        pointerEvents: 'none !important',
      },
    }}>
      <FullCalendar
        key="calendar" 
        ref={calendarRef}
        plugins={[multiMonthPlugin, interactionPlugin]}
        initialView="multiMonth"
        headerToolbar={{
          left: '',
          center: 'title',
          right: 'today prev,next'
        }}
        height="100%"
        contentHeight="auto"
        expandRows={true}
        stickyHeaderDates={true}
        handleWindowResize={true}
        aspectRatio={aspectRatio}
        multiMonthTitleFormat={{ month: 'long' }}
        views={{
          multiMonth: {
            multiMonthMaxColumns: 4, // Force exactly 4 months per row
            multiMonthMinWidth: 0, // Set to very small value to ensure 4 months fit
            multiMonthMaxRows: 3, // Force 3 rows
            duration: { months: monthCount }
          }
        }}
        dayHeaderFormat={{ weekday: 'narrow' }} // Use single letter for weekday names
        firstDay={1} // Start weeks on Monday to save space (Optional, remove if you prefer Sunday)
        events={events} // Add events from selectedDates
        dateClick={handleDateClick} // Use our date click handler
        dayCellDidMount={dayCellDidMount} // Custom day renderer for text symbols
      />
    </Box>
  );
};

export default Calendar;
