import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOrganization, registerUser } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Bot, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Building2,
  Briefcase,
  Users,
  Code,
  ArrowRight, 
  CheckCircle2,
  KeyRound,
  Globe
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, quickLogin, user } = useAuth();

  const [isOrgRegister, setIsOrgRegister] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Organization Registration Form States
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      // Handled in context toast
    } finally {
      setLoading(false);
    }
  };

  const handleOrgRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !adminEmail.trim()) return;

    setLoading(true);
    try {
      // 1. Create Organization
      const orgRes = await createOrganization({
        name: orgName.trim(),
        domain: orgDomain.trim() || 'example.com'
      });

      // 2. Register Organization Admin Profile
      await registerUser({
        name: adminName.trim() || `${orgName} Admin`,
        email: adminEmail.trim(),
        password: adminPassword || 'password123',
        role: 'org_admin',
        org_id: orgRes.org_id
      });

      toast.success(`Organization '${orgRes.name}' created with Org Admin '${adminEmail}'!`);

      // 3. Log in as newly created Org Admin
      await login(adminEmail.trim(), adminPassword || 'password123');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Organization registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const presetAccounts = [
    {
      user_id: 'USER_SUPER_ADMIN',
      name: 'Application Super Admin',
      email: 'admin@intentlog.ai',
      role: 'super_admin',
      role_level: 5,
      role_display_name: 'Application Super Admin',
      org_id: 'GLOBAL',
      desc: 'Global Application Oversight & Health',
      icon: ShieldCheck,
      color: '#c084fc'
    },
    {
      user_id: 'USER_ORG_ADMIN',
      name: 'Acme Org Admin',
      email: 'orgadmin@acme.com',
      role: 'org_admin',
      role_level: 4,
      role_display_name: 'Organization Admin',
      org_id: 'ORG_ACME',
      desc: 'Creates Profiles & Full Rights Over Org',
      icon: Building2,
      color: '#8b5cf6'
    },
    {
      user_id: 'USER_MANAGER',
      name: 'Engineering Manager',
      email: 'manager@acme.com',
      role: 'manager',
      role_level: 3,
      role_display_name: 'Manager',
      org_id: 'ORG_ACME',
      desc: 'Rights for People Below His Level',
      icon: Briefcase,
      color: 'var(--primary)'
    },
    {
      user_id: 'USER_TEAM_LEAD',
      name: 'Frontend Team Lead',
      email: 'teamlead@acme.com',
      role: 'team_lead',
      role_level: 2,
      role_display_name: 'Team Lead',
      org_id: 'ORG_ACME',
      desc: 'Rights for Team Below His Level',
      icon: Users,
      color: 'var(--status-completed)'
    },
    {
      user_id: 'USER_003',
      name: 'Nithi (Employee)',
      email: 'nithi@acme.com',
      role: 'employee',
      role_level: 1,
      role_display_name: 'Employee',
      org_id: 'ORG_ACME',
      desc: 'Assigned Work, Deliverables & Meetings',
      icon: Code,
      color: 'var(--status-delayed)'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1100px',
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 900 ? '1.1fr 1.1fr' : '1fr',
        gap: '2rem',
        backgroundColor: '#0f172a',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Left Side Feature Showcase */}
        <div style={{
          padding: '3rem 2.5rem',
          background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '100px',
                height: '55px',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#090d16',
                border: '1.5px solid rgba(56, 189, 248, 0.45)',
                boxShadow: '0 0 18px rgba(56, 189, 248, 0.35)',
                padding: '3px',
                flexShrink: 0
              }}>
                <img src="/logo_bg.webp" alt="IntenT_loG" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                  IntenT<span style={{ color: 'var(--primary)' }}>_loG</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Multi-Tenant Hierarchy Access</span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.75rem' }}>
              Multi-Tenant Organization Governance
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Register your organization to generate custom tenant profiles and manage full access control across Managers, Team Leads, and Employees.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} color="#c084fc" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>admin(application)</strong>: Full rights over entire app, all orgs, health & metrics</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>organization(admin)</strong>: Create profiles & full rights over his organization</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Manager</strong>: Governance over team leads & employees below his level</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} color="var(--status-completed)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Team Lead</strong>: Task assignments & review rights over employees in team</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} color="var(--status-delayed)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Employee</strong>: Assigned work, submit deliverables, validate reports, join meetings</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Login Preset Buttons */}
          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              ⚡ Select Demo Role Profile to Login Instantly
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {presetAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.user_id}
                    onClick={() => {
                      quickLogin(acc);
                      navigate('/admin');
                    }}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={14} color={acc.color} />
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{acc.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{acc.desc}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: acc.color,
                      fontWeight: 700
                    }}>
                      L{acc.role_level} {acc.role.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Header Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => setIsOrgRegister(false)}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !isOrgRegister ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsOrgRegister(true)}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isOrgRegister ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Register Organization
            </button>
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            {isOrgRegister ? 'Register New Organization' : 'Sign In to Workspace'}
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {isOrgRegister ? 'Create an Organization tenant and initialize its Organization Admin profile' : 'Enter credentials or pick a demo profile on the left'}
          </p>

          {!isOrgRegister ? (
            /* Sign In Form */
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="email"
                    required
                    placeholder="orgadmin@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Organization Registration Form */
            <form onSubmit={handleOrgRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Organization Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. DesignLabs Inc"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Domain (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder="e.g. designlabs.io"
                    value={orgDomain}
                    onChange={(e) => setOrgDomain(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  🏢 Initial Organization Admin Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Org Admin Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nithi Manager"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                          backgroundColor: '#1e293b',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Org Admin Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="email"
                        required
                        placeholder="admin@designlabs.io"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                          backgroundColor: '#1e293b',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                          backgroundColor: '#1e293b',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                <span>{loading ? 'Creating Organization...' : 'Register Organization & Login'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {user && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--status-completed)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--status-completed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Active: <strong>{user.name}</strong> [{user.role_display_name || user.role.toUpperCase()}]</span>
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--status-completed)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Go to Control Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
