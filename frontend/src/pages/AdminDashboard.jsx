import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAllUsers, 
  registerUser,
  createOrganization,
  getOrganizations,
  dropOrganization,
  updateUserRole, 
  updateUserStatus, 
  deleteUserAccount,
  getAdminMetrics,
  getAdminAuditLogs,
  getMeetings,
  adminDeleteMeeting,
  adminReanalyzeMeeting,
  getTasks,
  updateTaskStatus,
  adminDeleteTask
} from '../services/api';
import { toast } from 'react-toastify';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Building2,
  Briefcase,
  Users, 
  Video, 
  CheckSquare, 
  FileCheck, 
  UserCheck, 
  UserX, 
  Trash2, 
  RefreshCw, 
  Activity, 
  Search, 
  Lock,
  Sparkles,
  Code,
  Layers,
  UserPlus,
  PlusCircle,
  Globe
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, role, roleLevel, roleDisplayName, orgId, isSuperAdmin, isOrgAdmin, isManager, isTeamLead, isEmployee, canManageUsers, canAssignTasks } = useAuth();

  const [activeTab, setActiveTab] = useState('hierarchy');
  const [metrics, setMetrics] = useState(null);
  const [organizationsList, setOrganizationsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [meetingsList, setMeetingsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Profile Modal State
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('employee');

  // Create Organization Modal State (Application Super Admin & Org Admin Right)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [orgId]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const userParams = isSuperAdmin ? {} : { org_id: orgId };
      const [mRes, orgsRes, uRes, mtRes, tRes, lRes] = await Promise.all([
        getAdminMetrics(userParams).catch(() => null),
        getOrganizations().catch(() => []),
        getAllUsers(userParams).catch(() => []),
        getMeetings().catch(() => []),
        getTasks().catch(() => []),
        getAdminAuditLogs(userParams).catch(() => ({ logs: [] }))
      ]);

      if (mRes) setMetrics(mRes);
      
      // Filter list strictly based on hierarchy & org rights boundary
      if (isSuperAdmin) {
        setOrganizationsList(orgsRes);
        setUsersList(uRes);
      } else {
        setOrganizationsList(orgsRes.filter(o => o.org_id === orgId));
        setUsersList(uRes.filter(u => u.org_id === orgId));
      }

      const rawMeetings = Array.isArray(mtRes) ? mtRes : (mtRes?.meetings || []);
      if (isSuperAdmin) {
        setMeetingsList(rawMeetings);
      } else {
        setMeetingsList(rawMeetings.filter(m => !m.org_id || m.org_id === orgId));
      }

      const rawTasks = Array.isArray(tRes) ? tRes : (tRes?.tasks || tRes || []);
      setTasksList(rawTasks);
      setAuditLogs(lRes.logs || []);
    } catch (err) {
      toast.error('Failed to load control panel data.');
    } finally {
      setLoading(false);
    }
  };

  // Create New Organization (Application Super Admin Right)
  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const res = await createOrganization({
        name: newOrgName.trim(),
        domain: newOrgDomain.trim() || 'example.com'
      });
      toast.success(`Organization '${res.name}' created with ID '${res.org_id}'!`);
      setShowCreateOrgModal(false);
      setNewOrgName('');
      setNewOrgDomain('');
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to create organization.');
    }
  };

  // Drop Organization (App Admin & Org Admin Right)
  const handleDropOrganization = async (targetOrg) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to drop organization '${targetOrg.name}' (${targetOrg.org_id})?\n\nThis will permanently delete the organization tenant, member accounts, and meetings!`)) return;

    try {
      await dropOrganization(targetOrg.org_id);
      toast.success(`Organization '${targetOrg.name}' dropped successfully.`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to drop organization.');
    }
  };

  // Create User Profile for Organization
  const handleCreateOrgProfile = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    try {
      const payload = {
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        password: 'password123',
        role: newMemberRole,
        org_id: orgId || 'ORG_ACME'
      };
      await registerUser(payload);
      toast.success(`Profile created for ${newMemberName} [${newMemberRole.toUpperCase()}] under Organization ${orgId}`);
      setShowCreateProfileModal(false);
      setNewMemberName('');
      setNewMemberEmail('');
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to create profile.');
    }
  };

  // Role Rights Hierarchy Updates
  const handleRoleChange = async (targetUser, newRole) => {
    if (newRole === 'super_admin' && !isSuperAdmin) {
      toast.error('Only Application Super Admin can grant Super Admin rights.');
      return;
    }
    if (targetUser.role_level >= roleLevel && !isSuperAdmin) {
      toast.error('Cannot modify rights of users at or above your hierarchy level.');
      return;
    }

    try {
      await updateUserRole(targetUser.user_id, newRole);
      toast.success(`Role for ${targetUser.name} updated to ${newRole.toUpperCase()}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update role.');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.role_level >= roleLevel && !isSuperAdmin) {
      toast.error('Cannot suspend users at or above your hierarchy level.');
      return;
    }

    const newStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserStatus(targetUser.user_id, newStatus);
      toast.info(`Account status for ${targetUser.name} set to ${newStatus.toUpperCase()}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.role_level >= roleLevel && !isSuperAdmin) {
      toast.error('Cannot delete users at or above your hierarchy level.');
      return;
    }
    if (!window.confirm(`Delete profile for '${targetUser.name}'?`)) return;

    try {
      await deleteUserAccount(targetUser.user_id);
      toast.success(`Profile for '${targetUser.name}' removed.`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user.');
    }
  };

  // Meeting & Task Override Actions
  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Delete meeting session and all associated tasks?')) return;
    try {
      await adminDeleteMeeting(meetingId);
      toast.success('Meeting deleted.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete meeting.');
    }
  };

  const handleReanalyzeMeeting = async (meetingId) => {
    try {
      toast.info('Re-running Qwen3 AI meeting extraction...');
      await adminReanalyzeMeeting(meetingId);
      toast.success('AI Meeting Analysis complete!');
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Re-analysis failed.');
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success(`Task status updated to ${newStatus}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete task?')) return;
    try {
      await adminDeleteTask(taskId);
      toast.success('Task deleted.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task.');
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role_display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeStyle = (userRole) => {
    switch(userRole) {
      case 'super_admin': return { bg: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', border: '#c084fc', text: '🛡️ APP SUPER ADMIN' };
      case 'org_admin': return { bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', border: '#8b5cf6', text: '🏢 ORG ADMIN' };
      case 'manager': return { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', border: '#6366f1', text: '👔 MANAGER' };
      case 'team_lead': return { bg: 'rgba(16, 185, 129, 0.2)', color: 'var(--status-completed)', border: 'var(--status-completed)', text: '🧢 TEAM LEAD' };
      default: return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-delayed)', border: 'var(--status-delayed)', text: '💻 EMPLOYEE' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Role Banner Header */}
      <div style={{
        padding: '1.5rem 2rem',
        backgroundColor: isSuperAdmin ? 'rgba(192, 132, 252, 0.1)' : isOrgAdmin ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)',
        border: isSuperAdmin ? '1px solid #c084fc' : isOrgAdmin ? '1px solid #8b5cf6' : '1px solid var(--primary)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 450px', minWidth: '280px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: isSuperAdmin ? '#c084fc' : isOrgAdmin ? '#8b5cf6' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            flexShrink: 0
          }}>
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                {roleDisplayName} Dashboard
              </h1>
              <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff'
              }}>
                LEVEL {roleLevel} • ORG: {orgId}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
              {isSuperAdmin && 'Application Super Admin Scope: Full governance over all organizations, global metrics, and system logs.'}
              {isOrgAdmin && `Organization Admin Scope: Rights to create/drop profiles for ${orgId}, and manage all org meetings, deliverables & members.`}
              {isManager && 'Manager Scope: Department governance, rights over team leads and employees below your level.'}
              {isTeamLead && 'Team Lead Scope: Task assignments, pre-validation reviews, and team meeting moderation.'}
              {isEmployee && 'Employee Scope: Assigned tasks, deliverable submissions, AI report validation, and meeting participation.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateOrgModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', border: '1px solid #c084fc', color: '#c084fc' }}
            >
              <Building2 size={16} color="#c084fc" />
              <span>Create Organization</span>
            </button>
          )}

          {canManageUsers && (
            <button
              onClick={() => setShowCreateProfileModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <UserPlus size={16} />
              <span>Create Org Profile</span>
            </button>
          )}

          <button
            onClick={fetchAdminData}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin-slow' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1.25rem'
      }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Organizations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{organizationsList.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#8b5cf6' }}>{isSuperAdmin ? 'Active Tenants' : 'Your Org Tenant'}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Scope Users</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{usersList.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Level 1-5 Profiles</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-completed)' }}>
            <Video size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Meetings Overview</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{meetingsList.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-completed)' }}>Google Meet Sessions</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-delayed)' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Extracted Tasks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{tasksList.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Qwen3 AI Action Items</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        gap: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('hierarchy')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'hierarchy' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'hierarchy' ? '#ffffff' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={18} color={activeTab === 'hierarchy' ? '#8b5cf6' : 'currentColor'} />
          <span>Hierarchy Rights & Profiles ({usersList.length})</span>
        </button>

        {canManageUsers && (
          <button
            onClick={() => setActiveTab('orgs')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'orgs' ? '3px solid #c084fc' : '3px solid transparent',
              color: activeTab === 'orgs' ? '#ffffff' : 'var(--text-dim)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building2 size={18} color={activeTab === 'orgs' ? '#c084fc' : 'currentColor'} />
            <span>Organizations Tenant Registry ({organizationsList.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('meetings')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'meetings' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'meetings' ? '#ffffff' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Video size={18} color={activeTab === 'meetings' ? '#8b5cf6' : 'currentColor'} />
          <span>Meetings Control ({meetingsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'tasks' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'tasks' ? '#ffffff' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckSquare size={18} color={activeTab === 'tasks' ? '#8b5cf6' : 'currentColor'} />
          <span>Task Rights ({tasksList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'logs' ? '#ffffff' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Activity size={18} color={activeTab === 'logs' ? '#8b5cf6' : 'currentColor'} />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Hierarchy Rights & Profiles Management */}
      {activeTab === 'hierarchy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search by name, email, role, or org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Showing {filteredUsers.length} profiles under scope boundary
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>User Profile</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Organization</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Hierarchy Role Rights</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Role Governance Rights</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const badge = getRoleBadgeStyle(u.role);
                  const isBelowUser = u.role_level < roleLevel || isSuperAdmin;
                  return (
                    <tr key={u.user_id || u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: badge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {u.org_id || 'ORG_ACME'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{
                            alignSelf: 'flex-start',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}>
                            {badge.text}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Level {u.role_level || 1} Rights</span>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: u.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: u.status === 'suspended' ? '#ef4444' : 'var(--status-completed)'
                        }}>
                          {u.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {isBelowUser ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              style={{
                                backgroundColor: '#0f172a',
                                color: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              {isSuperAdmin && <option value="super_admin">🛡️ admin(application)</option>}
                              <option value="org_admin">🏢 organization(admin)</option>
                              <option value="manager">👔 Manager</option>
                              <option value="team_lead">🧢 Team lead</option>
                              <option value="employee">💻 Empoyee</option>
                            </select>

                            <button
                              onClick={() => handleToggleStatus(u)}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                            >
                              <UserX size={14} color={u.status === 'suspended' ? 'var(--status-completed)' : '#f59e0b'} />
                              <span>{u.status === 'suspended' ? 'Activate' : 'Suspend'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                borderRadius: '6px',
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer'
                              }}
                              title="Delete Profile"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', italic: 'true' }}>
                            Superior Level (Protected)
                          </span>
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

      {/* Tab: Organizations Tenant Registry (Super Admin & Org Admin Rights) */}
      {activeTab === 'orgs' && canManageUsers && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Organization Name</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Org ID</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Domain</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Created Date</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Org Admin Rights</th>
              </tr>
            </thead>
            <tbody>
              {organizationsList.map((org) => (
                <tr key={org.id || org.org_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#ffffff' }}>
                    {org.name}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: '#c084fc', fontWeight: 700 }}>
                    {org.org_id}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)' }}>
                    {org.domain}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: 'var(--status-completed)'
                    }}>
                      ACTIVE TENANT
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDropOrganization(org)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                      title="Drop / Delete Organization"
                    >
                      <Trash2 size={14} />
                      <span>Drop Organization</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Meetings Control */}
      {activeTab === 'meetings' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Meeting Title</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Meeting Code</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Action Items</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Rights Controls</th>
              </tr>
            </thead>
            <tbody>
              {meetingsList.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#ffffff' }}>
                    {m.title}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {m.meeting_code || m.id}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: m.status === 'live' ? 'rgba(16, 185, 129, 0.2)' : '#334155',
                      color: m.status === 'live' ? 'var(--status-completed)' : 'var(--text-muted)'
                    }}>
                      {m.status ? m.status.toUpperCase() : 'COMPLETED'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    {m.tasks ? m.tasks.length : 0} Tasks
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    {roleLevel >= 2 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleReanalyzeMeeting(m.meeting_code || m.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        >
                          <Sparkles size={14} color="#8b5cf6" />
                          <span>Re-Run AI Analysis</span>
                        </button>

                        {roleLevel >= 3 && (
                          <button
                            onClick={() => handleDeleteMeeting(m.meeting_code || m.id)}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>View / Join Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Task Rights */}
      {activeTab === 'tasks' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Task Description</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Assigned Owner</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Deadline</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status Rights</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasksList.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#ffffff' }}>
                    {t.task}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {t.person || 'Unassigned'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {t.deadline || 'No deadline'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <select
                      value={t.status}
                      onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                      disabled={roleLevel < 1}
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    {roleLevel >= 2 && (
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          borderRadius: '6px',
                          padding: '0.35rem 0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {auditLogs.map((log) => (
            <div
              key={log.id}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: log.type === 'USER_AUTH' ? 'rgba(139, 92, 246, 0.2)' : log.type === 'AI_VALIDATION' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: log.type === 'USER_AUTH' ? '#c084fc' : log.type === 'AI_VALIDATION' ? 'var(--status-completed)' : 'var(--primary)'
                }}>
                  {log.type}
                </span>
                <span style={{ color: 'var(--text-main)' }}>{log.message}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create Organization Modal (Application Super Admin & Org Admin Right) */}
      {showCreateOrgModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #c084fc',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <Building2 size={24} color="#c084fc" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Create New Organization
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Register a new Organization tenant profile in the database.
            </p>

            <form onSubmit={handleCreateOrganization} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DesignLabs Inc"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. designlabs.io"
                  value={newOrgDomain}
                  onChange={(e) => setNewOrgDomain(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create User Profile Modal (Org Admin & Super Admin Right) */}
      {showCreateProfileModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Create Organization User Profile
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Create a new user profile for organization <strong>{orgId}</strong>.
            </p>

            <form onSubmit={handleCreateOrgProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Viswaa"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="viswaa@acme.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Assigned Hierarchy Role
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                >
                  {isSuperAdmin && <option value="super_admin">🛡️ admin(application)</option>}
                  <option value="org_admin">🏢 organization(admin)</option>
                  <option value="manager">👔 Manager</option>
                  <option value="team_lead">🧢 Team lead</option>
                  <option value="employee">💻 Empoyee</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateProfileModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
