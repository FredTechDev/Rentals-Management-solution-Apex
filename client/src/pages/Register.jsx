import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building, Home, Lock, Mail, Phone, User, UserPlus } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { showErrorAlert, showToast } from '../lib/alerts';
import { getApiErrorMessage } from '../lib/api';
import { authService } from '../services/authService';
import '../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: sessionLoading } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    interestedProperty: '',
    interestedUnit: ''
  });
  const [availableProperties, setAvailableProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableProperties();
  }, []);

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const fetchAvailableProperties = async () => {
    setLoadingProperties(true);

    try {
      const properties = await authService.getAvailableProperties();
      setAvailableProperties(properties);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load available properties.'));
    } finally {
      setLoadingProperties(false);
    }
  };

  const selectedProperty = availableProperties.find((property) => property._id === formData.interestedProperty);
  const selectedUnits = selectedProperty?.units || [];

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await authService.register({
        ...formData,
        role: 'tenant'
      });
      await showToast({
        icon: 'success',
        title: 'Application Submitted',
        text: response.message || 'Your application has been received. A confirmation email will follow after review.'
      });
      navigate('/login');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Registration failed. Please review your details.');
      setError(message);
      await showErrorAlert('Registration Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card auth-card-register">
        <div className="auth-header">
          <h2>Apply</h2>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={14} style={{ marginRight: '5px' }} /> Full Name</label>
            <input
              type="text"
              placeholder="Full name"
              value={formData.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label><Mail size={14} style={{ marginRight: '5px' }} /> Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label><Phone size={14} style={{ marginRight: '5px' }} /> Phone</label>
            <input
              type="tel"
              placeholder="Phone number"
              value={formData.phoneNumber}
              onChange={(event) => handleFieldChange('phoneNumber', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label><Lock size={14} style={{ marginRight: '5px' }} /> Password</label>
            <input
              type="password"
              placeholder="Choose a password"
              value={formData.password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              required
            />
          </div>

            <div className="form-group">
            <label><Building size={14} style={{ marginRight: '5px' }} /> Property</label>
            {loadingProperties ? (
              <p className="loading-text">Loading properties...</p>
            ) : (
              <select
                value={formData.interestedProperty}
                onChange={(event) => {
                  handleFieldChange('interestedProperty', event.target.value);
                  handleFieldChange('interestedUnit', '');
                }}
                required
                >
                  <option value="">Select a property</option>
                  {availableProperties.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.name} - {property.address} ({property.units.length} open units)
                    </option>
                  ))}
                </select>
              )}
            </div>

          {formData.interestedProperty && (
            <div className="form-group">
              <label><Home size={14} style={{ marginRight: '5px' }} /> Unit</label>
              <div className="auth-unit-grid">
                {selectedUnits.length > 0 ? selectedUnits.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className={`auth-unit-chip ${formData.interestedUnit === unit ? 'selected' : ''}`}
                    onClick={() => handleFieldChange('interestedUnit', unit)}
                  >
                    Unit {unit}
                  </button>
                )) : (
                  <p className="loading-text">No open units.</p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting || !formData.interestedUnit}
          >
            <UserPlus size={18} style={{ marginRight: '8px' }} />
            {submitting ? 'Submitting...' : 'Apply'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
