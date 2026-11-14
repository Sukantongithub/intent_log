import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import MeetingCard from '../components/MeetingCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import DeliverableUploadModal from '../components/DeliverableUploadModal';
import DashboardTodoList from '../components/DashboardTodoList';
import { 
  getMeetings, 
  getTasks, 
  deleteMeeting, 
  updateTaskStatus, 
  scheduleMeeting,
  exportMeetingMoMPDF 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Video, 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  FileDown,
  PieChart as PieIcon,
  Sparkles,
  ShieldCheck,
  Zap,
  Search,
  FileCheck,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Copy,
  Check,
  User,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, orgId, roleDisplayName } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedModalTask, setSelectedModalTask] = useState(null);

  // Quick Action States
  const [quickRoomCode, setQuickRoomCode] = useState('');
  const [isStartingInstant, setIsStartingInstant] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filter & Search States for Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('all'); // all | pending | in_progress | completed | high_priority

  const fetchData = async () => {
    try {
      setLoading(true);
      const currentOrg = orgId || user?.org_id;
      const params = isSuperAdmin || !currentOrg ? {} : { org_id: currentOrg };

      const [meetingsData, tasksData] = await Promise.all([
        getMeetings({ page: 1, limit: 6, ...params }),
        getTasks(params)
      ]);

      const rawMeetings = Array.isArray(meetingsData) ? meetingsData : (meetingsData?.meetings || []);
      const filteredMeetings = isSuperAdmin
        ? rawMeetings
        : rawMeetings.filter(m => !m.org_id || m.org_id === currentOrg);

      const rawTasks = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks || []);
      const filteredTasks = isSuperAdmin
        ? rawTasks
        : rawTasks.filter(t => !t.org_id || t.org_id === currentOrg);

      setMeetings(filteredMeetings);
      setTasks(filteredTasks);
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Task status updated successfully.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting(deleteTarget.id);
      toast.success('Meeting deleted successfully.');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete meeting.');
    }
  };

  // Quick Room Join
  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!quickRoomCode.trim()) {
      toast.warning('Please enter a meeting room code.');
      return;
    }
    const cleanCode = quickRoomCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    navigate(`/room/${cleanCode}`);
  };

  // Launch Instant Meeting
  const handleLaunchInstantMeeting = async () => {
    try {
      setIsStartingInstant(true);
      const meeting = await scheduleMeeting({ title: `Meeting Hall - ${new Date().toLocaleDateString()}` });
      toast.success(`Generated Room: ${meeting.meeting_code}`);
      navigate(`/room/${meeting.meeting_code}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create instant meeting.');
    } finally {
      setIsStartingInstant(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied room code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Compute Statistics dynamically
  const totalMeetings = meetings.length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const delayedTasks = tasks.filter(t => t.status === 'Delayed').length;
  const complianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  // Recharts Analytics Data with sleek Cyber/Neon palette matching logo
  const chartData = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'In Progress', value: inProgressTasks, color: '#38bdf8' },
    { name: 'Pending', value: pendingTasks, color: '#f59e0b' },
    { name: 'Delayed', value: delayedTasks, color: '#ef4444' }
  ];

  // Filter tasks based on search and active tab
  const filteredTaskList = tasks.filter(task => {
    const taskName = (task.task || '').toLowerCase();
    const taskOwner = (task.owner || task.person || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = taskName.includes(query) || taskOwner.includes(query);
    if (!matchesSearch) return false;

    if (taskFilter === 'pending') return task.status === 'Pending';
    if (taskFilter === 'in_progress') return task.status === 'In Progress';
    if (taskFilter === 'completed') return task.status === 'Completed';
    if (taskFilter === 'high_priority') return (task.priority || '').toLowerCase() === 'high';
    return true;
  });

  if (loading) {
    return <Loading text="Loading your AI workspace analytics..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Cyber-Glow Hero Command Center */}
      <div className="hero-cyber-panel">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Brand & Greetings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Glowing Wide Logo Banner */}
            <div className="logo-glow-avatar" style={{
              width: '160px',
              height: '88px',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#090d16',
              border: '2px solid rgba(56, 189, 248, 0.55)',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.4), inset 0 0 12px rgba(16, 185, 129, 0.2)',
              padding: '4px',
              flexShrink: 0
            }}>
              <img 
                src="/logo_bg.webp" 
                alt="IntenT_loG Brand Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                <h1 style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  IntenT_loG Neural Workspace
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Welcome back, <strong style={{ color: '#e2e8f0' }}>{user?.name || 'Viswaa'}</strong></span>
                <span>•</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{roleDisplayName || 'Team Member'}</span>
              </div>
            </div>
          </div>

          {/* Quick Room Action Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: '280px' }}>
            {/* Quick Room Joiner Form */}
            <form onSubmit={handleQuickJoin} style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text"
                placeholder="Enter 6-digit Room Code..."
                value={quickRoomCode}
                onChange={(e) => setQuickRoomCode(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.85rem',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Join
                <ArrowRight size={14} />
              </button>
            </form>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleLaunchInstantMeeting}
                disabled={isStartingInstant}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, var(--primary) 0%, #38bdf8 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                }}
              >
                <Zap size={14} />
                <span>{isStartingInstant ? 'Creating...' : 'Instant Room'}</span>
              </button>

              <Link
                to="/validation"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#34d399',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={14} />
                <span>AI Validator</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive Radiant KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Card 1: Total Meetings */}
        <div className="stat-card-glow" style={{ '--card-accent': '#38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Processed Meetings</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Video size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
            {totalMeetings}
          </div>
        </div>

        {/* Card 2: Extracted Tasks */}
        <div className="stat-card-glow" style={{ '--card-accent': '#818cf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Extracted Action Items</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <CheckSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
            {totalTasks}
          </div>
        </div>

        {/* Card 3: Active In-Flight Commitments */}
        <div className="stat-card-glow" style={{ '--card-accent': '#f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Active In-Pipeline</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
            {pendingTasks + inProgressTasks}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ color: '#64748b' }}>{pendingTasks} Pending • {inProgressTasks} In Progress</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Active</span>
          </div>
        </div>

        {/* Card 4: Verified Deliverables */}
        <div className="stat-card-glow" style={{ '--card-accent': '#10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Verified Deliverables</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
            {completedTasks}
          </div>
        </div>
      </div>

      {/* 3. Dual Visualizer: Commitment Health Radar & Daily Sprint To-Do List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Left: Commitment Health Radar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Commitment Health Radar</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Lifecycle breakdown of all meeting commitments</p>
            </div>
            <PieIcon size={20} color="#38bdf8" />
          </div>

          {totalTasks > 0 ? (
            <div style={{ width: '100%', height: 260, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute',
                top: '42%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{totalTasks}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tasks</div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No Task Analytics Yet"
              description="Start a live meeting or ingest a transcript to render analytics."
            />
          )}
        </div>

        {/* Right: Daily Sprint To-Do List */}
        <DashboardTodoList meetingTasks={tasks} user={user} />
      </div>


      {/* 5. Recent Meetings Command Hub */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Recent Meetings & Live Sessions</h2>
          </div>
          <Link to="/meetings" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <span>View All Meetings</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {meetings.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {meetings.slice(0, 6).map(meeting => {
              const code = meeting.meeting_code || meeting.id;
              const isCopied = copiedCode === code;

              return (
                <div
                  key={meeting.id}
                  className="card card-hover"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                        {meeting.title || 'Live Meeting Session'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(code)}
                        title="Copy Room Code"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isCopied ? '#10b981' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.72rem'
                        }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{code}</span>
                      </button>
                    </div>

                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                      margin: 0
                    }}>
                      {meeting.summary || 'Real-time multi-peer WebRTC speech meeting with automated Qwen3 commitment extraction.'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {meeting.date || 'Active Session'}
                    </span>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            toast.info('Downloading MoM PDF...');
                            const clean = (meeting.title || 'Meeting').replace(/[^a-zA-Z0-9_-]/g, '_');
                            await exportMeetingMoMPDF(meeting.id, `MoM_${clean}.pdf`);
                            toast.success('MoM PDF downloaded!');
                          } catch (err) {
                            toast.error(err.message || 'Download failed.');
                          }
                        }}
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#38bdf8',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Download Minutes of Meeting (MoM) PDF"
                      >
                        <FileDown size={12} />
                        <span>MoM</span>
                      </button>

                      <Link
                        to={`/room/${code}`}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Video size={12} />
                        <span>Join</span>
                      </Link>

                      <Link
                        to={`/meetings/${meeting.id}`}
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid var(--border-color)',
                          color: '#ffffff',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span>Details</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No Meetings Found"
            description="Launch an instant room or schedule a new meeting session."
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Meeting"
        message={`Are you sure you want to delete meeting "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteMeeting}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Member Deliverable Upload & AI Verification Modal */}
      {selectedModalTask && (
        <DeliverableUploadModal
          task={selectedModalTask}
          isOpen={!!selectedModalTask}
          onClose={() => setSelectedModalTask(null)}
          onTaskUpdated={fetchData}
        />
      )}
    </div>
  );
};

export default Dashboard;
