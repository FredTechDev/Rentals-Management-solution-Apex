import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from './components/AppLayout';
import { SessionProvider } from './context/SessionContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Register from './pages/Register';
import Settings from './pages/Settings';
import { useSession } from './hooks/useSession';
import './App.css';

const AppContent = () => {
  const { theme } = useTheme();
  const { isAuthenticated, loading, requiresPasswordChange } = useSession();
  const location = useLocation();
  const toasterTheme = theme === 'light' ? 'light' : 'dark';

  if (!loading && isAuthenticated && requiresPasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <>
      <Toaster richColors position="top-right" expand={true} theme={toasterTheme} />
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </AppLayout>
    </>
  );
};

function App() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default App;
