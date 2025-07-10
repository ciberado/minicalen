import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  currentSessionId: string | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  joinSession: () => {},
  leaveSession: () => {},
  currentSessionId: null,
});

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Listen for session events
    newSocket.on('session-joined', (data) => {
      console.log('Session joined:', data);
    });

    newSocket.on('user-joined', (data) => {
      console.log('User joined session:', data);
    });

    newSocket.on('user-left', (data) => {
      console.log('User left session:', data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const joinSession = (sessionId: string) => {
    if (socket && sessionId) {
      console.log('Joining session:', sessionId);
      
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
      console.log('Leaving session:', sessionId);
      socket.emit('leave-session', sessionId);
      setCurrentSessionId(null);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        joinSession,
        leaveSession,
        currentSessionId,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
