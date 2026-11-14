import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Video, 
  CheckSquare, 
  CalendarCheck,
  FileCheck, 
  Settings, 
  Bot, 
  PlusCircle, 
  ShieldCheck, 
  Lock,
  FolderKanban,
  X 
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Meetings', path: '/meetings', icon: Video },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Calendar', path: '/calendar', icon: CalendarCheck },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Rights', path: '/admin', icon: ShieldCheck, highlight: true });
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '74px',
              height: '40px',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#090d16',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.3)',
              padding: '2px',
              flexShrink: 0
            }}>
              <img
                src="/logo_bg.webp"
                alt="IntenT_loG Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.18rem',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 60%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                IntenT_loG
              </h2>
              <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                AI Meeting Intelligence
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            style={{
              display: window.innerWidth <= 992 ? 'flex' : 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Button */}
        <div style={{ padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
          <NavLink 
            to="/meetings/create" 
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            onClick={onClose}
          >
            <PlusCircle size={18} />
            <span>New Meeting</span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ padding: '0 0.75rem 0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : item.highlight ? '#c084fc' : 'var(--text-muted)',
                  backgroundColor: isActive ? (item.highlight ? 'rgba(139, 92, 246, 0.2)' : 'var(--primary-light)') : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'var(--transition)',
                  borderLeft: isActive ? (item.highlight ? '3px solid #8b5cf6' : '3px solid var(--primary)') : '3px solid transparent'
                })}
              >
                <Icon size={19} color={item.highlight ? '#8b5cf6' : 'currentColor'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div style={{
          padding: '1rem 0.75rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <NavLink
            to="/login"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            <Lock size={19} />
            <span>Switch Account</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
