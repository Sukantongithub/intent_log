import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Trash2, 
  Edit3, 
  Target, 
  Video, 
  CheckSquare, 
  TrendingUp, 
  Layers, 
  DollarSign,
  Grid,
  List,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { getProjects, createProject, deleteProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';

const Projects = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, orgId } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    status: 'In Progress',
    priority: 'Medium',
    lead_name: user?.name || 'Viswaa',
    team_members: 'Viswaa, Nithi, Sujith',
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    budget: '$25,000'
  });

  const fetchProjectsData = async () => {
    try {
      setLoading(true);
      const currentOrg = orgId || user?.org_id;
      const params = isSuperAdmin || !currentOrg ? {} : { org_id: currentOrg };
      const data = await getProjects(params);
      setProjects(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, [orgId]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Project name is required');
      return;
    }

    try {
      const members = formData.team_members
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        key: formData.key.trim() || undefined,
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        lead_name: formData.lead_name.trim(),
        team_members: members,
        start_date: formData.start_date || undefined,
        target_date: formData.target_date || undefined,
        budget: formData.budget.trim(),
        org_id: orgId || user?.org_id || 'ORG_ACME'
      };

      const created = await createProject(payload);
      toast.success(`Project "${created.name}" created successfully!`);
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        key: '',
        description: '',
        status: 'In Progress',
        priority: 'Medium',
        lead_name: user?.name || 'Viswaa',
        team_members: 'Viswaa, Nithi, Sujith',
        start_date: new Date().toISOString().slice(0, 10),
        target_date: '',
        budget: '$25,000'
      });
      fetchProjectsData();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id || deleteTarget.project_id);
      toast.success(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchProjectsData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    }
  };

  // Filter calculations
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchQuery || 
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.key && p.key.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.lead_name && p.lead_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || (p.priority || '').toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Top Metrics
  const totalProjects = projects.length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;
  const planningCount = projects.filter(p => p.status === 'Planning').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;
  const avgProgress = totalProjects > 0 
    ? Math.round(projects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / totalProjects) 
    : 0;

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return { label: 'Completed', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'planning':
        return { label: 'Planning', bg: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', border: 'rgba(129, 140, 248, 0.3)' };
      case 'on hold':
        return { label: 'On Hold', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { label: 'In Progress', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    }
  };

  const getPriorityBadge = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return { label: 'High', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'low':
        return { label: 'Low', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' };
      default:
        return { label: 'Med', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading Project Command Hub..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Actions Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}>
              <FolderKanban size={20} color="#ffffff" />
            </div>
            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Project Management Hub
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.35)'
          }}
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* 2. Top Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Active Projects</span>
            <FolderKanban size={17} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>{inProgressCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Total in workspace: {totalProjects}</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Planning Stage</span>
            <Target size={17} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>{planningCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Queued for kick-off</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Completed</span>
            <CheckCircle2 size={17} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>{completedCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.2rem', fontWeight: 600 }}>Archived & Delivered</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Overall Velocity</span>
            <TrendingUp size={17} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>{avgProgress}%</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Average milestone rate</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by project name, key, lead, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['all', 'In Progress', 'Planning', 'Completed'].map(st => (
              <button
                key={st}
                type="button"
                className={`filter-tab-pill ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem' }}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.76rem',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#94a3b8',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: viewMode === 'grid' ? '#38bdf8' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Grid View"
            >
              <Grid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: viewMode === 'table' ? '#38bdf8' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Projects Display: Grid or Table */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No Projects Found"
          description="Start a new multi-meeting project initiative to track deliverables and milestones."
          actionText="Create Project"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredProjects.map(proj => {
            const statusConfig = getStatusBadge(proj.status);
            const priorityConfig = getPriorityBadge(proj.priority);
            const projId = proj.id || proj.project_id;
            const completedMilestones = (proj.milestones || []).filter(m => m.completed).length;
            const totalMilestones = (proj.milestones || []).length;

            return (
              <div
                key={projId}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.1rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Card Top: Key, Priority, Status */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        letterSpacing: '0.04em'
                      }}>
                        {proj.key}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: priorityConfig.bg,
                        color: priorityConfig.color
                      }}>
                        {priorityConfig.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '12px',
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color,
                        border: `1px solid ${statusConfig.border}`
                      }}>
                        {statusConfig.label}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteTarget(proj);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.2rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <Link
                    to={`/projects/${projId}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <h3 style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      margin: '0 0 0.35rem 0',
                      lineHeight: 1.3
                    }}>
                      {proj.name}
                    </h3>
                  </Link>

                  <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {proj.description || 'Active initiative tracking cross-meeting deliverable outcomes.'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#94a3b8' }}>Milestones Progress</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{proj.progress || 0}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${proj.progress || 0}%`,
                      height: '100%',
                      background: proj.progress === 100 
                        ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
                        : 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Metadata Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={13} color="var(--primary)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Lead: <strong style={{ color: '#e2e8f0' }}>{proj.lead_name}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} color="#f59e0b" />
                    <span>Target: {proj.target_date || 'Ongoing'}</span>
                  </div>

                  {totalMilestones > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Target size={13} color="#10b981" />
                      <span>{completedMilestones}/{totalMilestones} Milestones</span>
                    </div>
                  )}

                  {proj.budget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DollarSign size={13} color="#38bdf8" />
                      <span>{proj.budget}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <Link
                  to={`/projects/${projId}`}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <span>Open Project Workspace</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Key</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Project Name</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Lead</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Progress</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Target Date</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(proj => {
                  const statusConfig = getStatusBadge(proj.status);
                  const priorityConfig = getPriorityBadge(proj.priority);
                  const projId = proj.id || proj.project_id;

                  return (
                    <tr
                      key={projId}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8'
                        }}>
                          {proj.key}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#f8fafc' }}>
                        <Link to={`/projects/${projId}`} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                          {proj.name}
                        </Link>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                        {proj.lead_name}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color
                        }}>
                          {statusConfig.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: priorityConfig.bg,
                          color: priorityConfig.color
                        }}>
                          {priorityConfig.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${proj.progress || 0}%`, height: '100%', backgroundColor: '#38bdf8' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{proj.progress || 0}%</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                        {proj.target_date || 'N/A'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <Link
                            to={`/projects/${projId}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(proj)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '0.2rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create Project Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderKanban size={20} color="#38bdf8" />
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#f8fafc' }}>
                  Create New Initiative
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Audio Pipeline v2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    Project Key (Shortcode)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAP-01 (Auto if blank)"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
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
                    Project Lead
                  </label>
                  <input
                    type="text"
                    value={formData.lead_name}
                    onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Goals, target deliverables, or scope of this project..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    <option value="In Progress">In Progress</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
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
                    Target Budget
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $25,000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Team Members (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Viswaa, Nithi, Sujith, Sukant"
                  value={formData.team_members}
                  onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
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

              {/* Form Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Project Initiative"
        message={`Are you sure you want to delete project "${deleteTarget?.name}" (${deleteTarget?.key})? Linked meetings and tasks will remain intact.`}
        confirmText="Delete Project"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Projects;
