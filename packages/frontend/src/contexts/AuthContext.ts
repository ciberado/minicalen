import { createContext } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthDialog: boolean;
  setShowAuthDialog: (show: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
