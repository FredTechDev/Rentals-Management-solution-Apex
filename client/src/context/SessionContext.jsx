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

  const refreshSession = async () => {
    const currentSession = readSession();
    if (!currentSession?.token) {
      signOut();
      return null;
    }

    setLoading(true);

    try {
      const authData = await authService.getCurrentUser();
      const nextSession = {
        token: currentSession.token,
        user: authData.user,
        member: authData.member || null,
        organization: authData.organization || null,
        organizations: authData.organizations || [],
        requiresPasswordChange: authData.user?.requiresPasswordChange || authData.user?.requires_password_change || false
      };

      writeSession(nextSession);
      setSession(nextSession);
      return authData;
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
        member: session?.member || null,
        organization: session?.organization || null,
        organizations: session?.organizations || [],
        token: session?.token || null,
        requiresPasswordChange: session?.requiresPasswordChange || session?.user?.requiresPasswordChange || session?.user?.requires_password_change || false,
        isAuthenticated: Boolean(session?.token),
        loading,
        signIn,
        signOut,
        refreshSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
