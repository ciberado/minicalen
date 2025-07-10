import { createContext, useState, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCategories } from './CategoryContext';
import { useWebSocket } from './WebSocketContext';

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
  autoSaveEnabled: boolean;
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
  sessionId: null,
  timestamp: null,
  saveSession: () => {},
  loadSession: async () => false,
  listSessions: async () => [],
  isLoading: false,
  autoSaveEnabled: false,
});

// Create a provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [isApplyingRemoteState, setIsApplyingRemoteState] = useState(false);
  const lastSavedStateRef = useRef<SessionState | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    foregroundCategories, 
    dateInfoMap,
    setForegroundCategories,
    setSelectedDate
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
  const statesEqual = useCallback((state1: any, state2: any): boolean => {
    // Compare foreground categories
    if (JSON.stringify(state1.foregroundCategories) !== JSON.stringify(state2.foregroundCategories)) {
      console.log('Categories changed:', {
        old: state2.foregroundCategories,
        new: state1.foregroundCategories
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
    if (sessionId && isConnected && !isApplyingRemoteState) {
      const currentState: SessionState = {
        foregroundCategories,
        dateInfoMap: Array.from(dateInfoMap.entries()),
        timestamp: new Date().toISOString()
      };
      
      console.log('Broadcasting state change:', currentState);
      broadcastStateChange(sessionId, currentState);
    }
  }, [sessionId, isConnected, isApplyingRemoteState, foregroundCategories, dateInfoMap, broadcastStateChange]);

  // Internal save function that can be called manually or automatically
  const saveSessionInternal = useCallback(async (sessionIdToSave: string, sessionState: SessionState, isManualSave: boolean = true) => {
    try {
      // Save the session to the backend
      const response = await fetch('http://localhost:3001/api/sessions', {
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
      
      // Log detailed state information
      if (isManualSave) {
        console.log('Session manually saved with ID:', sessionIdToSave);
        console.log('Session saved at:', new Date(sessionState.timestamp).toLocaleString());
      } else {
        console.log('Session auto-saved with ID:', sessionIdToSave);
        console.log('Session auto-saved at:', new Date(sessionState.timestamp).toLocaleString());
      }
      
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, []);

  // Function to check if state has changed and auto-save if needed
  const autoSaveIfChanged = useCallback(async () => {
    if (!sessionId || !lastSavedStateRef.current) {
      console.log('No session ID or last saved state, skipping auto-save check');
      return;
    }
    
    // Create current state snapshot for comparison (excluding timestamp)
    const currentStateData = {
      foregroundCategories,
      dateInfoMap: Array.from(dateInfoMap.entries())
    };
    
    const lastSavedStateData = {
      foregroundCategories: lastSavedStateRef.current.foregroundCategories,
      dateInfoMap: lastSavedStateRef.current.dateInfoMap
    };
    
    console.log('Comparing states:', {
      current: currentStateData,
      lastSaved: lastSavedStateData
    });
    
    // Compare with last saved state (excluding timestamp)
    const hasChanged = !statesEqual(currentStateData, lastSavedStateData);
    
    if (hasChanged) {
      console.log('Auto-saving due to state changes...');
      // Create the actual state to save with new timestamp
      const currentStateToSave: SessionState = {
        foregroundCategories,
        dateInfoMap: Array.from(dateInfoMap.entries()),
        timestamp: new Date().toISOString()
      };
      await saveSessionInternal(sessionId, currentStateToSave, false);
    } else {
      console.log('No changes detected, skipping auto-save');
    }
  }, [sessionId, foregroundCategories, dateInfoMap, statesEqual, saveSessionInternal]);

  // Set up auto-save interval when session is active
  useEffect(() => {
    if (autoSaveEnabled && sessionId) {
      console.log('Setting up auto-save interval for session:', sessionId);
      
      // Clear any existing interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      
      // Set up new interval for auto-save every 5 seconds
      autoSaveIntervalRef.current = setInterval(() => {
        console.log('Auto-save interval triggered');
        autoSaveIfChanged();
      }, 5000);
      
      // Clean up interval on unmount or when auto-save is disabled
      return () => {
        console.log('Cleaning up auto-save interval');
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
          autoSaveIntervalRef.current = null;
        }
      };
    } else {
      console.log('Auto-save not enabled or no session ID:', { autoSaveEnabled, sessionId });
    }
  }, [autoSaveEnabled, sessionId, autoSaveIfChanged]);

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
      dateInfoMap: dateInfoArray,
      timestamp
    };
    
    // Save the session using the internal function
    await saveSessionInternal(newSessionId, sessionState, true);
    
    // Enable auto-save after the first manual save
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
      console.log('Auto-save enabled - session will be automatically saved every 5 seconds when changes are detected');
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
      
      // Join the WebSocket room for collaboration
      if (isConnected) {
        console.log('Joining WebSocket room for loaded session:', id);
        joinSession(id);
      }
      
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
      
      // Initialize the last saved state for auto-save comparison
      lastSavedStateRef.current = {
        foregroundCategories: sessionData.foregroundCategories,
        dateInfoMap: sessionData.dateInfoMap,
        timestamp: sessionData.timestamp
      };
      
      // Enable auto-save for loaded sessions
      setAutoSaveEnabled(true);
      
      console.log('Session loaded with ID:', id);
      console.log('Session timestamp:', new Date(sessionData.timestamp).toLocaleString());
      console.log('Auto-save enabled for loaded session');
      
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

  // Handle incoming state updates from other clients
  const handleRemoteStateUpdate = useCallback((remoteState: SessionState) => {
    console.log('Applying remote state update:', remoteState);
    
    // Set flag to prevent broadcasting this change back
    setIsApplyingRemoteState(true);
    
    // Apply the remote state
    setForegroundCategories(remoteState.foregroundCategories);
    setTimestamp(remoteState.timestamp);
    
    // Restore date info from remote state
    const dateInfoEntries = remoteState.dateInfoMap;
    dateInfoEntries.forEach(([dateStr, info]: [string, { color: string, categoryId: string }]) => {
      setSelectedDate(dateStr, info.color, info.categoryId);
    });
    
    // Reset the flag after a short delay to allow state updates to propagate
    setTimeout(() => {
      setIsApplyingRemoteState(false);
      
      // Update the last saved state reference after applying remote state
      // This ensures we don't re-broadcast the same state we just received
      lastSavedStateRef.current = {
        foregroundCategories: remoteState.foregroundCategories,
        dateInfoMap: remoteState.dateInfoMap,
        timestamp: remoteState.timestamp
      };
    }, 100);
  }, [setForegroundCategories, setSelectedDate, setTimestamp]);

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
  useEffect(() => {
    if (sessionId && !isApplyingRemoteState && lastSavedStateRef.current) {
      // Check if state has actually changed compared to last saved state
      const currentStateData = {
        foregroundCategories,
        dateInfoMap: Array.from(dateInfoMap.entries())
      };
      
      const lastSavedStateData = {
        foregroundCategories: lastSavedStateRef.current.foregroundCategories,
        dateInfoMap: lastSavedStateRef.current.dateInfoMap
      };
      
      const hasChanged = !statesEqual(currentStateData, lastSavedStateData);
      
      if (hasChanged) {
        console.log('State changed, broadcasting to other clients after delay');
        
        // Debounce the broadcast to prevent spam (500ms delay)
        const timeoutId = setTimeout(() => {
          broadcastCurrentState();
          
          // Update last saved state reference to include the broadcast
          lastSavedStateRef.current = {
            foregroundCategories,
            dateInfoMap: Array.from(dateInfoMap.entries()),
            timestamp: new Date().toISOString()
          };
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [foregroundCategories, dateInfoMap, sessionId, isApplyingRemoteState, statesEqual, broadcastCurrentState]);

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
        autoSaveEnabled,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use the session context
export const useSession = () => useContext(SessionContext);
