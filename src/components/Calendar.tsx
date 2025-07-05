import { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import multiMonthPlugin from '@fullcalendar/multimonth';
import './Calendar.css'; // Import custom calendar styles

interface CalendarProps {
  // Add any props you might need in the future
}

const Calendar = ({}: CalendarProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [monthCount] = useState(12); // Always 12 months
  const [aspectRatio, setAspectRatio] = useState(1.5); // Starting aspect ratio
  
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
        const newAspectRatio = containerWidth / containerHeight;
        
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
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
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
      },
      '.fc .fc-col-header-cell': {
        padding: '2px 0',
        fontSize: '0.75rem',
      },
      '.fc .fc-day-today': { // Highlight today
        backgroundColor: 'rgba(25, 118, 210, 0.08)'
      }
    }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin]}
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
      />
    </Box>
  );
};

export default Calendar;
