import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageCircle, 
  LogOut, 
  X,
  User,
  Settings,
  Shield
} from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { formatRoleLabel } from '../utils/roles';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const session = useSession();
  const { user, signOut } = session;

  const handleLogout = () => {
    signOut();
    navigate('/login');
    onClose();
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Community', path: '/community', icon: MessageCircle },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  if (!user) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-mobile-overlay" onClick={onClose} />
      )}

      <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-branding">
            <div className="branding-icon">
              {user.role === 'super_admin' ? <Shield size={18} /> : 'A'}
            </div>
            <span className="branding-text">
              {user.role === 'super_admin' ? 'Apex Admin' : 'Apex Agencies'}
            </span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          {allNavItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar-small">
              <User size={18} />
            </div>
            <div className="user-meta">
              <span className="user-meta-name">{user.name}</span>
              <span className="user-meta-role">{formatRoleLabel(user.role)}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
