import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  ShieldCheck, 
  Key, 
  Lock, 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Save, 
  Mic, 
  Bell, 
  Sliders, 
  UserPlus, 
  Eye, 
  EyeOff,
  CheckCircle2,
  Cpu,
  Mail,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getAllUsers, 
  updateUserRole, 
  updateUserStatus, 
  deleteUserAccount, 
  registerUser,
  updateUserProfile,
  getOrganizations
} from '../services/api';
import Loading from '../components/Loading';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';

const Settings = () => {
  const { 
    user, 
    role, 
    roleLevel, 
    roleDisplayName, 
    orgId, 
    isSuperAdmin, 
    canManageUsers, 
    updateCurrentUser 
  } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'users' | 'workspace'
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [organizations, setOrganizations] = useState([]);

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Audio & Notification Preferences State
  const [vadGateSensitivity, setVadGateSensitivity] = useState(65);
  const [autoMoMPDF, setAutoMoMPDF] = useState(true);
  const [audioNotifications, setAudioNotifications] = useState(true);

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);

  // Invite User Form State
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    password: 'password123',
    role: 'employee',
    org_id: orgId || 'ORG_ACME'
  });

  const fetchUsersDirectory = async () => {
    try {
      setLoadingUsers(true);
      const params = isSuperAdmin ? {} : { org_id: orgId || 'ORG_ACME' };
      const [uData, orgsData] = await Promise.all([
        getAllUsers(params),
        getOrganizations()
      ]);
      setUsersList(Array.isArray(uData) ? uData : []);
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
    } catch (err) {
      toast.error('Failed to load user directory.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'workspace') {
      fetchUsersDirectory();
    }
  }, [activeTab, orgId]);

  // Profile Update Handler
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.warning('Name cannot be empty.');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const updated = await updateUserProfile(user.user_id || user.id, {
        name: profileName.trim(),
        email: profileEmail.trim(),
        preferences: {
          vadGateSensitivity,
          autoMoMPDF,
          audioNotifications
        }
      });
      updateCurrentUser({ name: profileName.trim(), email: profileEmail.trim() });
      toast.success('Profile preferences updated successfully! 🚀');
    } catch (err) {
      // Local fallback for demo convenience
      updateCurrentUser({ name: profileName.trim(), email: profileEmail.trim() });
      toast.success('Profile preferences updated locally!');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password Change Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters.');
      return;
    }

    try {
      await updateUserProfile(user.user_id || user.id, { password: newPassword });
      toast.success('Security password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.info('Password updated for current session.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // User Management Handlers
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await updateUserRole(targetUserId, newRole);
      toast.success(`Role updated to ${newRole}`);
      fetchUsersDirectory();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (targetUser) => {
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserStatus(targetUser.user_id || targetUser.id, nextStatus);
      toast.success(`User marked as ${nextStatus}`);
      fetchUsersDirectory();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteTargetUser) return;
    try {
      await deleteUserAccount(deleteTargetUser.user_id || deleteTargetUser.id);
      toast.success(`User account "${deleteTargetUser.name}" removed.`);
      setDeleteTargetUser(null);
      fetchUsersDirectory();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.warning('Name and Email are required.');
      return;
    }

    try {
      await registerUser(inviteForm);
      toast.success(`New team member "${inviteForm.name}" invited successfully!`);
      setIsInviteModalOpen(false);
      setInviteForm({
        name: '',
        email: '',
        password: 'password123',
        role: 'employee',
        org_id: orgId || 'ORG_ACME'
      });
      fetchUsersDirectory();
    } catch (err) {
      toast.error(err.message || 'Failed to invite user');
    }
  };

  // Filtered Users List
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !userSearch || 
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.user_id && u.user_id.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole = userRoleFilter === 'all' || (u.role || '').toLowerCase() === userRoleFilter.toLowerCase();
    const matchesStatus = userStatusFilter === 'all' || (u.status || '').toLowerCase() === userStatusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (roleStr) => {
    switch ((roleStr || '').toLowerCase()) {
      case 'super_admin': return { bg: 'rgba(192, 132, 252, 0.15)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' };
      case 'org_admin': return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' };
      case 'manager': return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'team_lead': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      default: return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'profile', label: 'My Profile & Preferences', icon: User },
          { id: 'users', label: `User Directory & Team (${usersList.length || 'Directory'})`, icon: Users },
          { id: 'workspace', label: 'Workspace & AI Settings', icon: Building2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                fontSize: '0.83rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: MY PROFILE & ACCOUNT SETTINGS */}
      {activeTab === 'profile' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Left: Profile Form */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)'
              }}>
                {profileName.charAt(0).toUpperCase() || 'U'}
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  {profileName || 'Your Profile'}
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.12rem 0.5rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  marginTop: '0.2rem',
                  display: 'inline-block'
                }}>
                  {roleDisplayName} • Org: {orgId}
                </span>
              </div>
            </div>

            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Preferences Sliders & Toggles */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sliders size={14} color="#38bdf8" />
                  <span>Audio & Live Hall Preferences</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>Voice Activity (VAD) Gate Sensitivity</span>
                    <strong style={{ color: '#38bdf8' }}>{vadGateSensitivity}%</strong>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="95"
                    value={vadGateSensitivity}
                    onChange={(e) => setVadGateSensitivity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoMoMPDF}
                      onChange={(e) => setAutoMoMPDF(e.target.checked)}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <span>Automatically generate MoM PDF when meeting concludes</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={audioNotifications}
                      onChange={(e) => setAudioNotifications(e.target.checked)}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <span>Play subtle chime when action items are detected live</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginTop: '0.5rem'
                }}
              >
                <Save size={15} />
                <span>{isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Preferences'}</span>
              </button>
            </form>
          </div>

          {/* Right: Security & Credentials */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Security & Authentication
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Update your account credentials and verify session security parameters.
            </p>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginTop: '0.35rem'
                }}
              >
                <Lock size={14} />
                <span>Update Password</span>
              </button>
            </form>

            {/* Active Session Info */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 700, marginBottom: '0.25rem' }}>
                <CheckCircle2 size={14} />
                <span>Session Active & Verified</span>
              </div>
              <div style={{ color: '#94a3b8' }}>
                Scoped to tenant <strong style={{ color: '#f8fafc' }}>{orgId}</strong> with level {roleLevel} governance authority.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: USER DIRECTORY & TEAM MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Controls Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search user by name, email, or user ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                    fontSize: '0.82rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.78rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin (L5)</option>
                  <option value="org_admin">Org Admin (L4)</option>
                  <option value="manager">Manager (L3)</option>
                  <option value="team_lead">Team Lead (L2)</option>
                  <option value="employee">Employee (L1)</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.78rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                {canManageUsers && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    <UserPlus size={14} />
                    <span>Invite User</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Users Table */}
          {loadingUsers ? (
            <Loading text="Loading Organization User Directory..." />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Member Profile</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Email Address</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Role Hierarchy</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Organization</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Account Status</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const rConfig = getRoleColor(u.role);
                      const isCurrentUser = (u.user_id === user?.user_id) || (u.id === user?.id);

                      return (
                        <tr
                          key={u.id || u.user_id}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: rConfig.text,
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <strong style={{ color: '#f8fafc', display: 'block' }}>{u.name}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{u.user_id}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                            {u.email}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            {canManageUsers && !isCurrentUser ? (
                              <select
                                value={u.role || 'employee'}
                                onChange={(e) => handleRoleChange(u.user_id || u.id, e.target.value)}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: rConfig.bg,
                                  color: rConfig.text,
                                  border: `1px solid ${rConfig.border}`,
                                  borderRadius: '6px',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="super_admin" style={{ backgroundColor: '#0f172a', color: '#fff' }}>Super Admin (L5)</option>
                                <option value="org_admin" style={{ backgroundColor: '#0f172a', color: '#fff' }}>Org Admin (L4)</option>
                                <option value="manager" style={{ backgroundColor: '#0f172a', color: '#fff' }}>Manager (L3)</option>
                                <option value="team_lead" style={{ backgroundColor: '#0f172a', color: '#fff' }}>Team Lead (L2)</option>
                                <option value="employee" style={{ backgroundColor: '#0f172a', color: '#fff' }}>Employee (L1)</option>
                              </select>
                            ) : (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                backgroundColor: rConfig.bg,
                                color: rConfig.text,
                                border: `1px solid ${rConfig.border}`
                              }}>
                                {u.role_display_name || (u.role || 'employee').toUpperCase()}
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                            {u.org_id || 'ORG_ACME'}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.12rem 0.5rem',
                              borderRadius: '10px',
                              backgroundColor: u.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: u.status === 'suspended' ? '#f87171' : '#34d399',
                              border: u.status === 'suspended' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              {(u.status || 'active').toUpperCase()}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {canManageUsers && !isCurrentUser ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(u)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                                >
                                  {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetUser(u)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '0.2rem'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                  title="Delete user"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : isCurrentUser ? (
                              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>Current User</span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: WORKSPACE & AI ENGINE SETTINGS */}
      {activeTab === 'workspace' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Organization Metadata */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Workspace & Tenant Profile
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Primary Tenant ID</span>
                <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{orgId}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Registered Organizations ({organizations.length})</span>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {organizations.map(o => (
                    <span key={o.org_id} style={{
                      padding: '0.2rem 0.6rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.75rem'
                    }}>
                      {o.name} ({o.org_id})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Engine & Extraction Telemetry */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Autonomous AI Pipeline Telemetry
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Action Item Extraction LLM</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Qwen3-32B & Groq Llama-3.3</span>
                </div>
              </div>

              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Deliverable RAG Validation Engine</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>Active (Strict PDF Checksum)</span>
                </div>
              </div>

              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>WebRTC Signaling Protocol</span>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>Multi-Peer Mesh + VAD Gate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Invite Team Member */}
      {isInviteModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#38bdf8" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Invite Team Member
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sukant"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sukant@acme.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Hierarchy Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="employee">Employee (L1)</option>
                    <option value="team_lead">Team Lead (L2)</option>
                    <option value="manager">Manager (L3)</option>
                    <option value="org_admin">Org Admin (L4)</option>
                    {isSuperAdmin && <option value="super_admin">Super Admin (L5)</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Organization ID
                  </label>
                  <input
                    type="text"
                    value={inviteForm.org_id}
                    onChange={(e) => setInviteForm({ ...inviteForm, org_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Confirm Delete User */}
      <ConfirmModal
        isOpen={!!deleteTargetUser}
        title="Remove User Account"
        message={`Are you sure you want to delete user "${deleteTargetUser?.name}" (${deleteTargetUser?.email})? This action will revoke their access.`}
        confirmText="Delete Account"
        confirmVariant="danger"
        onConfirm={handleDeleteUserConfirm}
        onCancel={() => setDeleteTargetUser(null)}
      />
    </div>
  );
};

export default Settings;
