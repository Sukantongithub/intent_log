import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Menu, User, ShieldCheck, LogOut, ChevronDown, Lock, Building2, Briefcase, Users, Code, Settings } from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, roleLevel, roleDisplayName, orgId, isSuperAdmin, canManageUsers, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/admin') return `${roleDisplayName} Control Panel`;
    if (path === '/login') return 'Authentication';
    if (path === '/meetings') return 'Meetings Overview';
    if (path === '/meetings/create') return 'Create New Meeting';
    if (path.startsWith('/meetings/')) return 'Meeting Details';
    if (path === '/projects') return 'Projects';
    if (path.startsWith('/projects/')) return 'Project Details';
    if (path === '/tasks') return 'Action Items & Tasks';
    if (path === '/calendar') return 'Task Calendar & Deadlines';
    if (path === '/settings') return 'User Management & Settings';
    if (path.startsWith('/validation')) return 'Validate Progress';
    return 'Dashboard';
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'super_admin': return '#c084fc';
      case 'org_admin': return '#8b5cf6';
      case 'manager': return 'var(--primary)';
      case 'team_lead': return 'var(--status-completed)';
      default: return 'var(--status-delayed)';
    }
  };

  return (
    <header className="navbar-header" style={{
      backgroundColor: '#000000',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left Title & Mobile Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: 'var(--radius-md)',
            flexShrink: 0
          }}
          title="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div style={{
          width: '58px',
          height: '32px',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
          padding: '2px',
          flexShrink: 0
        }}>
          <img src="/logo_bg.webp" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h2 className="navbar-title">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {/* Admin Control Panel Direct Button */}
        {canManageUsers && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid #8b5cf6',
              color: '#c084fc',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <ShieldCheck size={14} color="#8b5cf6" />
            <span className="control-panel-btn-text">Control Panel</span>
          </button>
        )}

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.25rem 0.35rem',
              borderRadius: '8px'
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: getRoleBadgeColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: '#ffffff',
              flexShrink: 0
            }}>
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>

            <div className="navbar-user-text" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.2 }}>
                {user?.name || 'User Profile'}
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: getRoleBadgeColor(),
                fontWeight: 700
              }}>
                L{roleLevel} • {roleDisplayName.toUpperCase()}
              </span>
            </div>

            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '230px',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '0.5rem',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Signed in as ({orgId})</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email || 'user@acme.com'}
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Settings size={16} color="var(--primary)" />
                <span>Profile & Settings</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/admin');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#c084fc',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <ShieldCheck size={16} />
                <span>Rights & Governance</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/login');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Lock size={16} />
                <span>Switch Role / Account</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
