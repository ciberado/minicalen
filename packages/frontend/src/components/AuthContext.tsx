import React, { useState, ReactNode } from 'react';
import { useSession } from '../auth/client';
import { AuthContext } from '../contexts/AuthContext';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, isPending } = useSession();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const user = session?.user || null;
  const isAuthenticated = !!user;
  const isLoading = isPending;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        showAuthDialog,
        setShowAuthDialog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
