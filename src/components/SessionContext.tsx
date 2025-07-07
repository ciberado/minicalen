import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCategories } from './CategoryContext';

interface SessionState {
  foregroundCategories: any[];
  backgroundCategories: any[];
  tagCategories: any[];
  dateInfoMap: any;
  timestamp: string; // ISO timestamp when the session was saved
}

interface SessionContextType {
  sessionId: string | null;
  timestamp: string | null; // ISO timestamp when the session was saved
  saveSession: () => void;
  loadSession: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
  sessionId: null,
  timestamp: null,
  saveSession: () => {},
  loadSession: async () => false,
  isLoading: false,
});

// Create a provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    foregroundCategories, 
    backgroundCategories,
    tagCategories,
    dateInfoMap,
  } = useCategories();

  // Check for session ID in the URL hash when the component mounts
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      loadSession(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the current application state
  const saveSession = () => {
    // Generate a new UUID if one doesn't exist
    const newSessionId = sessionId || uuidv4();
    setSessionId(newSessionId);
    
    // Update the URL hash
    window.location.hash = newSessionId;
    
    // Convert Map to an array for better logging
    const dateInfoArray = Array.from(dateInfoMap.entries());
    
    // Get current timestamp in ISO format
    const timestamp = new Date().toISOString();
    setTimestamp(timestamp);
    
    // Prepare the state to be saved
    const sessionState: SessionState = {
      foregroundCategories,
      backgroundCategories,
      tagCategories,
      dateInfoMap: dateInfoArray,
      timestamp
    };
    
    // Log detailed state information
    console.log('Session saved with ID:', newSessionId);
    console.log('Session saved at:', new Date(timestamp).toLocaleString());
    console.log('Session state:', sessionState);
    console.log('Foreground Categories:', foregroundCategories);
    console.log('Background Categories:', backgroundCategories);
    console.log('Tag Categories:', tagCategories);
    console.log('Date Info Map (key-value pairs):', dateInfoArray);
    
    // Check if selected dates are captured
    const selectedDatesInfo = foregroundCategories
      .filter(cat => cat.selected)
      .map(cat => `${cat.label} (${cat.id}): ${cat.color}`);
    console.log('Selected foreground categories:', selectedDatesInfo);
    
    // Check if date backgrounds are captured
    if (dateInfoArray.length > 0) {
      console.log('Dates with backgrounds:');
      dateInfoArray.forEach(([date, info]) => {
        console.log(`- ${date}: color=${info.color}, categoryId=${info.categoryId}`);
      });
    } else {
      console.log('No dates with backgrounds found');
    }
    
    // In a real implementation, you might send this to a server
    // fetch('/api/save-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ id: newSessionId, state: sessionState })
    // });
  };

  // Load a session by ID
  const loadSession = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // In a real implementation, you would fetch from a server
      // const response = await fetch(`/api/sessions/${id}`);
      // const data = await response.json();
      
      // For now, we'll just set the session ID and return true
      setSessionId(id);
      
      // Set a timestamp for when the session was loaded
      const loadTimestamp = new Date().toISOString();
      setTimestamp(loadTimestamp);
      
      // In a real implementation, you would restore the state:
      // setForegroundCategories(data.state.foregroundCategories);
      // setBackgroundCategories(data.state.backgroundCategories);
      // setTagCategories(data.state.tagCategories);
      // 
      // // Restore dateInfoMap
      // const newDateInfoMap = new Map(data.state.dateInfoMap);
      // newDateInfoMap.forEach((info, dateStr) => {
      //   setSelectedDate(dateStr, info.color, info.categoryId);
      // });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      setIsLoading(false);
      return false;
    }
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        timestamp,
        saveSession,
        loadSession,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use the session context
export const useSession = () => useContext(SessionContext);
