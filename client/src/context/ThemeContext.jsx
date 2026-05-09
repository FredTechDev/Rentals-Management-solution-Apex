import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  MIDNIGHT: 'midnight',
  FOREST: 'forest',
  SUNSET: 'sunset'
};

const themeConfigs = {
  [THEMES.DARK]: {
    '--primary': '#6366f1',
    '--secondary': '#a855f7',
    '--accent': '#f43f5e',
    '--bg-dark': '#0f172a',
    '--bg-image': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
    '--bg-card': 'rgba(30, 41, 59, 0.7)',
    '--text-main': '#f8fafc',
    '--text-muted': '#94a3b8',
    '--glass': 'rgba(255, 255, 255, 0.05)',
    '--glass-border': 'rgba(255, 255, 255, 0.1)',
    '--surface-strong': 'rgba(15, 23, 42, 0.88)',
    '--color-scheme': 'dark'
  },
  [THEMES.LIGHT]: {
    '--primary': '#2563eb',
    '--secondary': '#7c3aed',
    '--accent': '#e11d48',
    '--bg-dark': '#f8fafc',
    '--bg-image': 'radial-gradient(at 0% 0%, hsla(210, 40%, 96%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(220, 30%, 90%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(230, 20%, 88%, 1) 0, transparent 50%)',
    '--bg-card': 'rgba(255, 255, 255, 0.8)',
    '--text-main': '#0f172a',
    '--text-muted': '#475569',
    '--glass': 'rgba(0, 0, 0, 0.03)',
    '--glass-border': 'rgba(0, 0, 0, 0.08)',
    '--surface-strong': 'rgba(255, 255, 255, 0.95)',
    '--color-scheme': 'light'
  },
  [THEMES.MIDNIGHT]: {
    '--primary': '#818cf8',
    '--secondary': '#c084fc',
    '--accent': '#fb7185',
    '--bg-dark': '#020617',
    '--bg-image': 'radial-gradient(at 0% 0%, hsla(260, 50%, 10%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(280, 40%, 15%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(300, 30%, 10%, 1) 0, transparent 50%)',
    '--bg-card': 'rgba(15, 23, 42, 0.75)',
    '--text-main': '#f5f3ff',
    '--text-muted': '#a5b4fc',
    '--glass': 'rgba(139, 92, 246, 0.1)',
    '--glass-border': 'rgba(139, 92, 246, 0.2)',
    '--surface-strong': 'rgba(2, 6, 23, 0.92)',
    '--color-scheme': 'dark'
  },
  [THEMES.FOREST]: {
    '--primary': '#10b981',
    '--secondary': '#059669',
    '--accent': '#f59e0b',
    '--bg-dark': '#064e3b',
    '--bg-image': 'radial-gradient(at 0% 0%, hsla(160, 50%, 5%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(150, 40%, 15%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(140, 30%, 10%, 1) 0, transparent 50%)',
    '--bg-card': 'rgba(6, 78, 59, 0.7)',
    '--text-main': '#ecfdf5',
    '--text-muted': '#6ee7b7',
    '--glass': 'rgba(16, 185, 129, 0.1)',
    '--glass-border': 'rgba(16, 185, 129, 0.2)',
    '--surface-strong': 'rgba(2, 44, 34, 0.9)',
    '--color-scheme': 'dark'
  },
  [THEMES.SUNSET]: {
    '--primary': '#f97316',
    '--secondary': '#db2777',
    '--accent': '#fbbf24',
    '--bg-dark': '#450a0a',
    '--bg-image': 'radial-gradient(at 0% 0%, hsla(20, 50%, 10%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(0, 40%, 15%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(340, 30%, 10%, 1) 0, transparent 50%)',
    '--bg-card': 'rgba(127, 29, 29, 0.7)',
    '--text-main': '#fff7ed',
    '--text-muted': '#fdba74',
    '--glass': 'rgba(249, 115, 22, 0.1)',
    '--glass-border': 'rgba(249, 115, 22, 0.2)',
    '--surface-strong': 'rgba(69, 10, 10, 0.9)',
    '--color-scheme': 'dark'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apex-theme') || THEMES.DARK;
  });

  useEffect(() => {
    const config = themeConfigs[theme];
    const root = document.documentElement;

    Object.entries(config).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    localStorage.setItem('apex-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
