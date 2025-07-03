import { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import multiMonthPlugin from '@fullcalendar/multimonth';

interface CalendarProps {
  // Add any props you might need in the future
}

const Calendar = ({}: CalendarProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [monthCount, setMonthCount] = useState(12); // Default to 12 months
  const [aspectRatio, setAspectRatio] = useState(1.35); // Default aspect ratio

  // Calculate optimal size based on container
  useEffect(() => {
    const resizeCalendar = () => {
      // Calculate the aspect ratio based on the window size
      // Lower aspect ratio makes calendar cells wider
      const windowWidth = window.innerWidth;
      
      // Adjust aspect ratio based on available width
      // This helps to stretch the calendar horizontally
      if (windowWidth > 1600) {
        setAspectRatio(1.1);  // Very wide screen - make cells wider
      } else if (windowWidth > 1200) {
        setAspectRatio(1.25); // Wide screen
      } else {
        setAspectRatio(1.35); // Normal/small screen
      }
      
      // Update the calendar's monthCount if needed
      if (calendarRef.current) {
        setMonthCount(12); // Always show 12 months
      }
    };

    resizeCalendar();
    window.addEventListener('resize', resizeCalendar);
    
    return () => {
      window.removeEventListener('resize', resizeCalendar);
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
      },
      '.fc .fc-toolbar': {
        marginBottom: 1,
      },
      '.fc .fc-multimonth': { // Target FullCalendar's multimonth container
        height: 'auto !important',
        width: '100% !important',
        overflowY: 'hidden', // Prevent scrolling
      },
      '.fc .fc-multimonth-month': { // Target each month
        marginBottom: 0,
        padding: 0,
      },
      '.fc .fc-multimonth-monthheader': {
        padding: '4px 0',
      },
      '.fc .fc-daygrid-day-top': {
        justifyContent: 'center', // Center day numbers
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
          left: 'title',
          center: '',
          right: 'today prev,next'
        }}
        height="100%"
        contentHeight="auto"
        expandRows={true}
        stickyHeaderDates={true}
        handleWindowResize={true}
        aspectRatio={aspectRatio}
        multiMonthTitleFormat={{ year: 'numeric' }}
        views={{
          multiMonth: {
            multiMonthMaxColumns: 6, // Allow up to 6 months per row to fill wider screens
            multiMonthMinWidth: 150, // Allow smaller months to fit more in a row
            duration: { months: monthCount }
          }
        }}
      />
    </Box>
  );
};

export default Calendar;
