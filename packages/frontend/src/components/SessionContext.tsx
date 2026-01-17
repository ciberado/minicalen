import { createContext, useState, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCategories, RemoteCategoryState, DateInfoEntry } from './CategoryContext';
import { useWebSocket } from './WebSocketContext';
import { getApiUrl } from '../config/api';
import { Category } from './Categories';
import { TextCategory } from './CategoryContext';

// Session state interface uses DateInfoEntry from CategoryContext

interface SessionState {
  foregroundCategories: Category[];
  textCategories: TextCategory[]; // Add text categories
  dateInfoMap: [string, DateInfoEntry][]; // Array of [dateString, DateInfo] tuples
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
  const lastSavedStateRef = useRef<SessionState | null>(null);
  const { 
    foregroundCategories, 
    textCategories,
    dateInfoMap,
    setForegroundCategories,
    setTextCategories,
    setSelectedDate,
    applyRemoteState,
    isRemoteUpdate
  } = useCategories();
  const { joinSession, isConnected, broadcastStateChange, onStateUpdate, offStateUpdate } = useWebSocket();

  // Check for session ID in the URL hash when the component mounts
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && hash.length > 0) {
      loadSession(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join WebSocket room when connection is established and we have a session
  useEffect(() => {
    if (isConnected && sessionId) {
      console.log('WebSocket connected, joining room for session:', sessionId);
      joinSession(sessionId);
    }
  }, [isConnected, sessionId, joinSession]);

  // Helper function to compare states (excluding timestamp for meaningful change detection)
  const statesEqual = useCallback((state1: { foregroundCategories: Category[]; textCategories: TextCategory[]; dateInfoMap: [string, DateInfoEntry][] }, state2: { foregroundCategories: Category[]; textCategories: TextCategory[]; dateInfoMap: [string, DateInfoEntry][] }): boolean => {
    // Compare foreground categories
    if (JSON.stringify(state1.foregroundCategories) !== JSON.stringify(state2.foregroundCategories)) {
      console.log('Categories changed:', {
        old: state2.foregroundCategories,
        new: state1.foregroundCategories
      });
      return false;
    }
    
    // Compare text categories
    if (JSON.stringify(state1.textCategories) !== JSON.stringify(state2.textCategories)) {
      console.log('Text categories changed:', {
        old: state2.textCategories,
        new: state1.textCategories
      });
      return false;
    }
    
    // Compare date info maps
    if (JSON.stringify(state1.dateInfoMap) !== JSON.stringify(state2.dateInfoMap)) {
      console.log('Date info changed:', {
        old: state2.dateInfoMap,
        new: state1.dateInfoMap
      });
      return false;
    }
    
    return true;
  }, []);

  // Broadcast state changes to other clients (but not when applying remote state)
  const broadcastCurrentState = useCallback(() => {
    // Check the synchronous ref to see if we're applying remote state
    if (isRemoteUpdate()) {
      console.log('Skipped broadcast - currently applying remote state');
      return;
    }
    
    if (sessionId && isConnected) {
      const currentState: SessionState = {
        foregroundCategories,
        textCategories,
        dateInfoMap: Array.from(dateInfoMap.entries()),
        timestamp: new Date().toISOString()
      };
      
      console.log('Broadcasting state change:', currentState);
      broadcastStateChange(sessionId, currentState);
    } else {
      console.log('Skipped broadcast:', {
        sessionId: !!sessionId,
        isConnected
      });
    }
  }, [sessionId, isConnected, isRemoteUpdate, foregroundCategories, textCategories, dateInfoMap, broadcastStateChange]);

  // Internal save function that can be called manually
  const saveSessionInternal = useCallback(async (sessionIdToSave: string, sessionState: SessionState) => {
    try {
      // Save the session to the backend
      const response = await fetch(getApiUrl('/sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sessionIdToSave,
          state: sessionState
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Update the last saved state reference
      lastSavedStateRef.current = { ...sessionState };
      
      // Update timestamp
      setTimestamp(sessionState.timestamp);
      
      console.log('Session saved with ID:', sessionIdToSave);
      console.log('Session saved at:', new Date(sessionState.timestamp).toLocaleString());
      
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, []);

  // Save the current application state
  const saveSession = async () => {
    // Generate a new UUID if one doesn't exist
    const newSessionId = sessionId || uuidv4();
    setSessionId(newSessionId);
    
    // Update the URL hash
    window.location.hash = newSessionId;
    
    // Join the WebSocket room for collaboration
    if (isConnected) {
      console.log('Joining WebSocket room for session:', newSessionId);
      joinSession(newSessionId);
    }
    
    // Convert Map to an array for better logging and storage
    const dateInfoArray = Array.from(dateInfoMap.entries());
    
    // Get current timestamp in ISO format
    const timestamp = new Date().toISOString();
    
    // Prepare the state to be saved
    const sessionState: SessionState = {
      foregroundCategories,
      textCategories,
      dateInfoMap: dateInfoArray,
      timestamp
    };
    
    // Save the session using the internal function
    await saveSessionInternal(newSessionId, sessionState);
  };

  // Load a session by ID
  const loadSession = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Load the session from the backend
      const response = await fetch(getApiUrl(`/sessions/${id}`));
      
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
      
      // Join the WebSocket room for collaboration
      if (isConnected) {
        console.log('Joining WebSocket room for loaded session:', id);
        joinSession(id);
      }
      
      // Restore categories
      setForegroundCategories(sessionData.foregroundCategories);
      
      // Restore text categories (with fallback for older sessions)
      if (sessionData.textCategories) {
        setTextCategories(sessionData.textCategories);
      }
      
      // Restore date info
      const dateInfoEntries = sessionData.dateInfoMap;
      
      // Clear existing date info first (to avoid duplicates)
      // This will need to be done carefully to avoid UI flickering
      
      // Restore each date's info
      dateInfoEntries.forEach(([dateStr, info]: [string, { color: string, categoryId: string, textCategoryIds?: string[] }]) => {
        setSelectedDate(dateStr, info.color, info.categoryId);
      });
      
      // Initialize the last saved state for state comparison
      lastSavedStateRef.current = {
        foregroundCategories: sessionData.foregroundCategories,
        textCategories: sessionData.textCategories || [],
        dateInfoMap: sessionData.dateInfoMap,
        timestamp: sessionData.timestamp
      };
      
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
      const response = await fetch(getApiUrl('/sessions'));
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  };

  // Handle incoming state updates from other clients
  const handleRemoteStateUpdate = useCallback((remoteState: SessionState) => {
    console.log('SessionContext: Received remote state update:', remoteState);
    
    // Update the last saved state reference FIRST, before applying changes
    // This prevents the broadcast effect from detecting a "change"
    lastSavedStateRef.current = {
      foregroundCategories: remoteState.foregroundCategories,
      textCategories: remoteState.textCategories || [],
      dateInfoMap: remoteState.dateInfoMap,
      timestamp: remoteState.timestamp
    };
    
    // Update timestamp
    setTimestamp(remoteState.timestamp);
    
    // Use the atomic applyRemoteState function from CategoryContext
    // This sets the isRemoteUpdate flag, applies all state, then resets the flag
    const remoteCategoryState: RemoteCategoryState = {
      foregroundCategories: remoteState.foregroundCategories,
      textCategories: remoteState.textCategories || [],
      dateInfoMap: remoteState.dateInfoMap
    };
    
    applyRemoteState(remoteCategoryState);
    
    console.log('SessionContext: Remote state applied successfully');
  }, [applyRemoteState, setTimestamp]);

  // Set up WebSocket state update listener
  useEffect(() => {
    if (sessionId) {
      onStateUpdate(handleRemoteStateUpdate);
      
      // Clean up listener on unmount or session change
      return () => {
        offStateUpdate(handleRemoteStateUpdate);
      };
    }
  }, [sessionId, onStateUpdate, offStateUpdate, handleRemoteStateUpdate]);

  // Broadcast state changes when they occur (with debouncing to prevent spam)
  // Only auto-save after a session has been explicitly created (manually saved or loaded)
  useEffect(() => {
    // Early exit if we're applying remote state (check synchronous ref)
    if (isRemoteUpdate()) {
      console.log('Broadcast effect: Skipping - remote update in progress');
      return;
    }
    
    if (sessionId && lastSavedStateRef.current) {
      // Check if state has actually changed compared to last saved state
      const currentStateData = {
        foregroundCategories,
        textCategories,
        dateInfoMap: Array.from(dateInfoMap.entries())
      };
      
      const lastSavedStateData = {
        foregroundCategories: lastSavedStateRef.current.foregroundCategories,
        textCategories: lastSavedStateRef.current.textCategories || [],
        dateInfoMap: lastSavedStateRef.current.dateInfoMap
      };
      
      const hasChanged = !statesEqual(currentStateData, lastSavedStateData);
      
      if (hasChanged) {
        console.log('State changed locally, broadcasting to other clients after delay');
        
        // Debounce the broadcast to prevent spam
        const timeoutId = setTimeout(() => {
          // Double-check we're not applying remote state (synchronous ref check)
          if (isRemoteUpdate()) {
            console.log('Skipped broadcast - remote update started during debounce');
            return;
          }
          
          if (sessionId) {
            // Re-check if the state is still different to avoid stale broadcasts
            const latestCurrentStateData = {
              foregroundCategories,
              textCategories,
              dateInfoMap: Array.from(dateInfoMap.entries())
            };
            
            if (!statesEqual(latestCurrentStateData, lastSavedStateData)) {
              broadcastCurrentState();
              
              // Update last saved state reference to include the broadcast
              lastSavedStateRef.current = {
                foregroundCategories,
                textCategories,
                dateInfoMap: Array.from(dateInfoMap.entries()),
                timestamp: new Date().toISOString()
              };
            } else {
              console.log('Skipped broadcast - state reverted or synchronized');
            }
          } else {
            console.log('Skipped broadcast - no session');
          }
        }, 500); // Debounce time for responsiveness
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [foregroundCategories, textCategories, dateInfoMap, sessionId, isRemoteUpdate, statesEqual, broadcastCurrentState]);

  // Only broadcast state changes when manually saving (not on every state change)
  // This prevents performance issues and infinite loops

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
