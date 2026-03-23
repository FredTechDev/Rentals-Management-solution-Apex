import React, { createContext, useEffect, useState } from 'react';
import { clearSession, readSession, writeSession } from '../lib/session';
import { authService } from '../services/authService';

export const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => readSession());
  const [loading, setLoading] = useState(() => {
    const storedSession = readSession();
    return Boolean(storedSession?.token && !storedSession?.user);
  });

  const signIn = (nextSession) => {
    writeSession(nextSession);
    setSession(nextSession);
    setLoading(false);
  };

  const signOut = () => {
    clearSession();
    setSession(null);
    setLoading(false);
  };

  const setUser = (nextUser) => {
    const currentSession = readSession();
    if (!currentSession?.token) {
      return;
    }

    const nextSession = {
      token: currentSession.token,
      user: nextUser
    };

    writeSession(nextSession);
    setSession(nextSession);
  };

  const refreshSession = async () => {
    const currentSession = readSession();
    if (!currentSession?.token) {
      signOut();
      return null;
    }

    setLoading(true);

    try {
      const currentUser = await authService.getCurrentUser();
      const nextSession = {
        token: currentSession.token,
        user: currentUser
      };

      writeSession(nextSession);
      setSession(nextSession);
      return currentUser;
    } catch (error) {
      signOut();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleSessionExpiry = () => {
      signOut();
    };

    window.addEventListener('apex:session-expired', handleSessionExpiry);
    return () => window.removeEventListener('apex:session-expired', handleSessionExpiry);
  }, []);

  useEffect(() => {
    const storedSession = readSession();
    if (storedSession?.token && !storedSession?.user) {
      refreshSession();
      return;
    }

    setLoading(false);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        isAuthenticated: Boolean(session?.token),
        loading,
        signIn,
        signOut,
        setUser,
        refreshSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
