import { useRef, useEffect, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction'; // Import the interaction plugin
import './Calendar.css'; // Import custom calendar styles
import './noBorders.css'; // Import border removal styles
import { useCategories } from './CategoryContext'; // Import our context

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
    selectedDates,
    dateInfoMap,
    setSelectedDate
  } = useCategories();
  
  // Get the currently selected foreground category (if any)
  const selectedForegroundCategory = useMemo(() => {
    return foregroundCategories.find(cat => cat.selected === true);
  }, [foregroundCategories]);
  
  // Convert selectedDates Map to FullCalendar events
  const events = useMemo(() => {
    const eventArray: any[] = [];
    
    console.log('Building events from selectedDates:', 
      Array.from(selectedDates.entries()).map(([date, color]) => ({ date, color }))
    );
    
    // Convert each date entry to an event object
    selectedDates.forEach((color, dateStr) => {
      if (color) {
        eventArray.push({
          id: dateStr,
          start: dateStr,
          allDay: true,
          display: 'background',
          backgroundColor: color
        });
      }
    });
    
    console.log('Generated events:', eventArray);
    return eventArray;
  }, [selectedDates]);

  // Force calendar to refresh when dates change
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  }, [selectedDates]);

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

  // Handle date clicks
  const handleDateClick = (arg: any) => {
    const dateStr = arg.dateStr; // Format: YYYY-MM-DD
    
    // If no foreground category is selected, do nothing
    if (!selectedForegroundCategory || !selectedForegroundCategory.color) {
      console.log('No foreground category selected or it has no color');
      return;
    }
    
    console.log('Date clicked:', dateStr);
    console.log('Selected category:', selectedForegroundCategory);
    
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
    }}>
      <FullCalendar
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
        eventClick={(info) => {
          // Handle event click (optional)
          console.log('Event clicked:', info.event);
          const dateStr = info.event.startStr;
          setSelectedDate(dateStr, null, null); // Remove the date properly with null categoryId
          
          // Use setTimeout to allow state update to complete
          setTimeout(() => {
            calendarRef.current?.getApi().refetchEvents();
          }, 0);
        }}
        dateClick={handleDateClick} // Use our date click handler
      />
    </Box>
  );
};

export default Calendar;
