import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  Menu, 
  Palette,
  Building,
  Loader2,
  UserCircle
} from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { THEMES, useTheme } from '../context/ThemeContext';
import { formatRoleLabel } from '../utils/roles';

const routeNames = {
  '/': 'Dashboard',
  '/community': 'Community',
  '/login': 'Login',
  '/register': 'Register',
};

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user, roles, organization, organizations, switchOrganization, switchingOrganization, setUser } = useSession();
  const { theme, setTheme } = useTheme();
  
  const currentPage = routeNames[location.pathname] || 'Dashboard';

  const handleOrganizationChange = async (e) => {
    const nextId = e.target.value;
    if (nextId) {
      await switchOrganization(nextId);
    }
  };

  const handleRoleChange = (e) => {
    const nextRole = e.target.value;
    if (nextRole && user) {
      setUser({ ...user, role: nextRole });
    }
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

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
          <>
            {roles && roles.length > 1 && (
              <div className="role-switcher">
                <UserCircle size={16} />
                <select value={user.role} onChange={handleRoleChange} className="role-select">
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="header-search md-hide">
              <Search size={16} />
              <input type="text" placeholder="Search..." />
            </div>
            
            <button className="header-icon-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
          </>
        )}

        <div className="nav-theme-switcher">
          <Palette size={16} />
          <select value={theme} onChange={handleThemeChange} className="theme-select">
            <option value={THEMES.DARK}>Dark</option>
            <option value={THEMES.LIGHT}>Light</option>
            <option value={THEMES.MIDNIGHT}>Midnight</option>
            <option value={THEMES.FOREST}>Forest</option>
            <option value={THEMES.SUNSET}>Sunset</option>
          </select>
        </div>

        {user && organizations && organizations.length > 1 && (
          <div className="workspace-switcher">
            <div className="workspace-icon">
              {organization?.name?.charAt(0) || 'A'}
            </div>
            <div className="workspace-details">
              <span className="workspace-label">Workspace</span>
              <div className="workspace-select-wrapper">
                <select 
                  value={organization?._id || organization?.id || ''} 
                  onChange={handleOrganizationChange}
                  disabled={switchingOrganization}
                  className="org-select"
                >
                  {organizations.map(org => (
                    <option key={org._id || org.id} value={org._id || org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                {switchingOrganization && <Loader2 size={12} className="animate-spin" />}
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="header-auth">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
