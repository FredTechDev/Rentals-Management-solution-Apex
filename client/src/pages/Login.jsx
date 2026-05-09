import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { showErrorAlert, showToast } from '../lib/alerts';
import { getApiErrorMessage } from '../lib/api';
import { authService } from '../services/authService';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: sessionLoading, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      const requiresPasswordChange = Boolean(response.user?.requiresPasswordChange || response.user?.requires_password_change);
      signIn({
        token: response.tokens?.accessToken || response.token,
        user: response.user,
        member: response.member,
        organization: response.organization,
        organizations: response.organizations,
        requiresPasswordChange
      });
      if (requiresPasswordChange) {
        navigate('/change-password');
      } else {
        await showToast({
          icon: 'success',
          title: 'Welcome Back',
          text: `Signed in as ${response.user.name}.`
        });
        navigate('/');
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Invalid email or password.');
      setError(message);
      await showErrorAlert('Login Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card auth-card-login">
        <span className="auth-eyebrow">Apex Access</span>
        <div className="auth-header">
          <h2>Sign in</h2>
          <p>Use the email and password assigned to your account. Landlords are approved by admin, and managers are added by landlords.</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Mail size={14} style={{ marginRight: '5px' }} /> Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label><Lock size={14} style={{ marginRight: '5px' }} /> Password</label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            <LogIn size={18} style={{ marginRight: '8px' }} />
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Need an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
