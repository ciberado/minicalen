import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl, debugApiConfig } from '../config/api';
import logger from '../logger';
import { Category } from './Categories';
import { TextCategory } from './CategoryContext';

// Define proper types matching the actual data structure
interface DateInfoEntry {
  color: string;
  categoryId: string;
  textCategoryIds?: string[];
}

interface SessionState {
  foregroundCategories: Category[];
  textCategories: TextCategory[]; // Text categories for date annotations
  dateInfoMap: [string, DateInfoEntry][]; // Array of [dateString, DateInfo] tuples
  timestamp: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  currentSessionId: string | null;
  broadcastStateChange: (sessionId: string, state: SessionState) => void;
  onStateUpdate: (callback: (state: SessionState) => void) => void;
  offStateUpdate: (callback: (state: SessionState) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  joinSession: () => {},
  leaveSession: () => {},
  currentSessionId: null,
  broadcastStateChange: () => {},
  onStateUpdate: () => {},
  offStateUpdate: () => {},
});

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const stateUpdateCallbacksRef = useRef<Set<(state: SessionState) => void>>(new Set());

  useEffect(() => {
    // Debug API configuration in development
    if (import.meta.env.DEV) {
      debugApiConfig();
    }
    
    // Initialize socket connection with dynamic URL
    const wsUrl = getWebSocketUrl();
    logger.info('Connecting to WebSocket at:', wsUrl);
    
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
      timeout: 20000, // 20 second timeout
      autoConnect: true
    });
    
    newSocket.on('connect', () => {
      logger.debug('Connected to WebSocket server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      logger.debug('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Listen for session events
    newSocket.on('session-joined', (data) => {
      logger.debug('Session joined:', data);
    });

    newSocket.on('user-joined', (data) => {
      logger.debug('User joined session:', data);
    });

    newSocket.on('user-left', (data) => {
      logger.debug('User left session:', data);
    });

    // Listen for state updates from other clients
    newSocket.on('state-update', (data: { sessionId: string; state: SessionState; fromUser: string }) => {
      logger.debug('Received state update from user:', data.fromUser, 'for session:', data.sessionId);
      logger.debug('State update:', data.state);
      
      // Notify all registered callbacks
      stateUpdateCallbacksRef.current.forEach((callback: (state: SessionState) => void) => {
        callback(data.state);
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []); // Remove stateUpdateCallbacks dependency to prevent constant re-renders

  const joinSession = (sessionId: string) => {
    if (socket && sessionId) {
      logger.debug('Joining session:', sessionId);
      
      // Leave current session if any
      if (currentSessionId) {
        socket.emit('leave-session', currentSessionId);
      }
      
      // Join new session
      socket.emit('join-session', sessionId);
      setCurrentSessionId(sessionId);
    }
  };

  const leaveSession = (sessionId: string) => {
    if (socket && sessionId) {
      logger.debug('Leaving session:', sessionId);
      socket.emit('leave-session', sessionId);
      setCurrentSessionId(null);
    }
  };

  const broadcastStateChange = (sessionId: string, state: SessionState) => {
    if (socket && sessionId && isConnected) {
      logger.debug('Broadcasting state change for session:', sessionId);
      socket.emit('state-change', {
        sessionId,
        state,
        fromUser: socket.id
      });
    }
  };

  const onStateUpdate = (callback: (state: SessionState) => void) => {
    stateUpdateCallbacksRef.current.add(callback);
  };

  const offStateUpdate = (callback: (state: SessionState) => void) => {
    stateUpdateCallbacksRef.current.delete(callback);
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        joinSession,
        leaveSession,
        currentSessionId,
        broadcastStateChange,
        onStateUpdate,
        offStateUpdate,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
