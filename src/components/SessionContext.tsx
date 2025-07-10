import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCategories } from './CategoryContext';

interface SessionState {
  foregroundCategories: any[];
  dateInfoMap: any;
  timestamp: string; // ISO timestamp when the session was saved
}

interface SessionContextType {
  sessionId: string | null;
  timestamp: string | null; // ISO timestamp when the session was saved
  saveSession: () => void;
  loadSession: (id: string) => Promise<boolean>;
  listSessions: () => Promise<Array<{id: string, timestamp: string}>>;
  isLoading: boolean;
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
  sessionId: null,
  timestamp: null,
  saveSession: () => {},
  loadSession: async () => false,
  listSessions: async () => [],
  isLoading: false,
});

// Create a provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    foregroundCategories, 
    dateInfoMap,
    setForegroundCategories,
    setSelectedDate
  } = useCategories();

  // Check for session ID in the URL hash when the component mounts
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && hash.length > 0) {
      loadSession(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the current application state
  const saveSession = async () => {
    // Generate a new UUID if one doesn't exist
    const newSessionId = sessionId || uuidv4();
    setSessionId(newSessionId);
    
    // Update the URL hash
    window.location.hash = newSessionId;
    
    // Convert Map to an array for better logging and storage
    const dateInfoArray = Array.from(dateInfoMap.entries());
    
    // Get current timestamp in ISO format
    const timestamp = new Date().toISOString();
    setTimestamp(timestamp);
    
    // Prepare the state to be saved
    const sessionState: SessionState = {
      foregroundCategories,
      dateInfoMap: dateInfoArray,
      timestamp
    };
    
    try {
      // Save the session to the backend
      const response = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newSessionId,
          state: sessionState
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Log detailed state information
      console.log('Session saved with ID:', newSessionId);
      console.log('Session saved at:', new Date(timestamp).toLocaleString());
      
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  // Load a session by ID
  const loadSession = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Load the session from the backend
      const response = await fetch(`http://localhost:3001/api/sessions/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error('Session not found:', id);
          setIsLoading(false);
          return false;
        }
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const sessionData = data.state;
      
      if (!sessionData) {
        console.error('Invalid session data:', id);
        setIsLoading(false);
        return false;
      }
      
      // Set session ID and timestamp
      setSessionId(id);
      setTimestamp(sessionData.timestamp);
      
      // Restore categories
      setForegroundCategories(sessionData.foregroundCategories);
      
      // Restore date info
      const dateInfoEntries = sessionData.dateInfoMap;
      
      // Clear existing date info first (to avoid duplicates)
      // This will need to be done carefully to avoid UI flickering
      
      // Restore each date's info
      dateInfoEntries.forEach(([dateStr, info]: [string, { color: string, categoryId: string }]) => {
        setSelectedDate(dateStr, info.color, info.categoryId);
      });
      
      console.log('Session loaded with ID:', id);
      console.log('Session timestamp:', new Date(sessionData.timestamp).toLocaleString());
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      setIsLoading(false);
      return false;
    }
  };
  
  // List all available sessions
  const listSessions = async (): Promise<Array<{id: string, timestamp: string}>> => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        timestamp,
        saveSession,
        loadSession,
        listSessions,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use the session context
export const useSession = () => useContext(SessionContext);
