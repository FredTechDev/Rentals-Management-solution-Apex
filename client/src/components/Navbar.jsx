import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { useSession } from '../hooks/useSession';

const routeNames = {
  '/': 'Dashboard',
  '/community': 'Community',
  '/settings': 'Settings',
  '/change-password': 'Change Password',
  '/login': 'Sign In',
  '/register': 'Apply'
};

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user, organization } = useSession();
  
  const currentPage = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className="header-nav">
      <div className="header-left">
        {user && (
          <button 
            className="sidebar-toggle-btn" 
            onClick={onMenuToggle}
            aria-label="Toggle Menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="breadcrumb-container">
          <Link to="/" className="breadcrumb-item">Home</Link>
          <ChevronRight size={14} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{currentPage}</span>
        </div>
      </div>

      <div className="header-actions">
        {user && (
          <div className="workspace-switcher">
            <div className="workspace-icon">
              {organization?.name?.charAt(0) || 'A'}
            </div>
            <div className="workspace-details">
              <span className="workspace-label">Workspace</span>
              <div className="workspace-select-wrapper">
                <span className="org-label">{organization?.name || 'Active workspace'}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;
