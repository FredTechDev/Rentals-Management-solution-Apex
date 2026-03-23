import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut, MessageCircle, User as UserIcon } from 'lucide-react';
import FloatingHint from './FloatingHint';
import { useSession } from '../hooks/useSession';
import { formatRoleLabel } from '../utils/roles';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useSession();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">APEX AGENCIES</Link>
      <div className="nav-links">
        <FloatingHint content="Return to the landing page or your role dashboard.">
          <Link to="/"><Home size={20} /> Home</Link>
        </FloatingHint>
        {user && (
          <FloatingHint content="Open the tenant and management community lounge.">
            <Link to="/community"><MessageCircle size={20} /> Community</Link>
          </FloatingHint>
        )}
        {user ? (
          <>
            <span className="user-name">
              <UserIcon size={18} />
              <span>{user.name}</span>
              <small>{formatRoleLabel(user.role)}</small>
            </span>
            <FloatingHint content="End the current session and return to login.">
              <button onClick={handleLogout} className="btn-logout" type="button">
                <LogOut size={18} />
              </button>
            </FloatingHint>
          </>
        ) : (
          <>
            <FloatingHint content="Sign into your existing dashboard.">
              <Link to="/login">Login</Link>
            </FloatingHint>
            <FloatingHint content="Create a tenant, landlord, or property manager account.">
              <Link to="/register" className="btn-primary">Register</Link>
            </FloatingHint>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
