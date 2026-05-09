import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, RotateCw } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { authService } from '../services/authService';
import { showErrorAlert, showToast } from '../lib/alerts';
import { getApiErrorMessage } from '../lib/api';
import '../styles/Auth.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, requiresPasswordChange, refreshSession } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await authService.changePassword({ currentPassword, newPassword });
      await showToast({
        icon: 'success',
        title: 'Password Updated',
        text: 'Your account is now ready to use.'
      });
      await refreshSession();
      navigate('/');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Failed to change password.');
      setError(message);
      await showErrorAlert('Password Change Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page-split">
      <div className="auth-shell">
        <div className="auth-aside glass-card">
          <span className="auth-eyebrow">Account Security</span>
          <h2>{requiresPasswordChange ? 'Set your password before continuing.' : 'Update your password anytime.'}</h2>
          <p>The backend requires this step when a temporary password is issued.</p>
          <div className="auth-chip-list">
            <span className="auth-chip"><Lock size={16} /> Auth protected</span>
            <span className="auth-chip"><KeyRound size={16} /> Temporary access</span>
          </div>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-header">
            <h2>Change Password</h2>
            <p>Use your current password, then choose a new one.</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><Lock size={14} style={{ marginRight: '5px' }} /> Current Password</label>
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label><KeyRound size={14} style={{ marginRight: '5px' }} /> New Password</label>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <RotateCw size={18} className="animate-spin" style={{ marginRight: '8px' }} /> : <KeyRound size={18} style={{ marginRight: '8px' }} />}
              {submitting ? 'Updating...' : 'Save Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
