const STORAGE_KEY = 'apex-session';
const LEGACY_TOKEN_KEY = 'token';

export const readSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedSession = window.localStorage.getItem(STORAGE_KEY);
  if (storedSession) {
    try {
      return JSON.parse(storedSession);
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const legacyToken = window.localStorage.getItem(LEGACY_TOKEN_KEY);
  return legacyToken ? { token: legacyToken, user: null } : null;
};

export const writeSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  if (session?.token) {
    window.localStorage.setItem(LEGACY_TOKEN_KEY, session.token);
  }
};

export const clearSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
};
