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
  const [switchingOrganization, setSwitchingOrganization] = useState(false);

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
      ...currentSession,
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
      const authData = await authService.getCurrentUser();
      const nextSession = {
        token: currentSession.token,
        user: authData.user,
        member: authData.member || null,
        roles: authData.roles || [],
        organization: authData.organization || null,
        organizations: authData.organizations || []
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

  const switchOrganization = async (organizationId) => {
    if (!session?.token || !organizationId || organizationId === session.organization?._id || organizationId === session.organization?.id) {
      return;
    }

    setSwitchingOrganization(true);
    try {
      const data = await authService.switchOrganization(organizationId);
      const nextSession = {
        token: data.tokens?.accessToken || data.token || session.token,
        user: data.user,
        member: data.member || null,
        roles: data.roles || [],
        organization: data.organization || null,
        organizations: data.organizations || []
      };
      
      writeSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      console.error('Failed to switch organization', error);
    } finally {
      setSwitchingOrganization(false);
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
        roles: session?.roles || [],
        organization: session?.organization || null,
        organizations: session?.organizations || [],
        token: session?.token || null,
        isAuthenticated: Boolean(session?.token),
        loading,
        switchingOrganization,
        signIn,
        signOut,
        setUser,
        refreshSession,
        switchOrganization
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
