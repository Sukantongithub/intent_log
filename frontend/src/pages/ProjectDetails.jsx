import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Video, 
  CheckSquare, 
  Target, 
  FileDown, 
  ShieldCheck, 
  Trash2, 
  Check, 
  Layers, 
  DollarSign, 
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { 
  getProject, 
  updateProject, 
  addProjectMilestone, 
  updateProjectMilestone, 
  deleteProjectMilestone,
  linkMeetingToProject,
  createProjectTask,
  updateTaskStatus,
  exportMeetingMoMPDF,
  getMeetings
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'milestones' | 'meetings' | 'team'

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    task: '',
    person: user?.name || 'Viswaa',
    priority: 'Medium',
    status: 'Pending',
    deadline: '',
    deliverable: 'Project Deliverable'
  });

  // Milestone creation form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  // Link meeting modal
  const [isLinkMeetingModalOpen, setIsLinkMeetingModalOpen] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const data = await getProject(id);
      setProject(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateProject(project.id || project.project_id, { status: newStatus });
      toast.success(`Project status updated to ${newStatus}`);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update project status');
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Task status updated');
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.task.trim()) return;

    try {
      await createProjectTask(project.id || project.project_id, taskForm);
      toast.success('Task added to project sprint!');
      setIsTaskModalOpen(false);
      setTaskForm({
        task: '',
        person: user?.name || 'Viswaa',
        priority: 'Medium',
        status: 'Pending',
        deadline: '',
        deliverable: 'Project Deliverable'
      });
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add task');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    try {
      await addProjectMilestone(project.id || project.project_id, {
        title: newMilestoneTitle.trim(),
        due_date: newMilestoneDate
      });
      toast.success('Milestone added!');
      setNewMilestoneTitle('');
      setNewMilestoneDate('');
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add milestone');
    }
  };

  const handleToggleMilestone = async (milestoneId, currentCompleted) => {
    try {
      await updateProjectMilestone(project.id || project.project_id, milestoneId, {
        completed: !currentCompleted
      });
      toast.success(!currentCompleted ? 'Milestone achieved! 🎯' : 'Milestone reopened');
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await deleteProjectMilestone(project.id || project.project_id, milestoneId);
      toast.info('Milestone removed');
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to delete milestone');
    }
  };

  const openLinkMeetingModal = async () => {
    try {
      const meetingsData = await getMeetings({ limit: 20 });
      const raw = Array.isArray(meetingsData) ? meetingsData : (meetingsData?.meetings || []);
      setAvailableMeetings(raw);
      if (raw.length > 0) setSelectedMeetingId(raw[0].id || raw[0]._id);
      setIsLinkMeetingModalOpen(true);
    } catch (err) {
      toast.error('Failed to load meetings');
    }
  };

  const handleLinkMeetingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMeetingId) return;

    try {
      await linkMeetingToProject(project.id || project.project_id, selectedMeetingId);
      toast.success('Meeting linked to this project!');
      setIsLinkMeetingModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to link meeting');
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading Project Workspace..." />;
  }

  if (!project) {
    return (
      <EmptyState
        title="Project Not Found"
        description="The project initiative you requested does not exist or was removed."
        actionText="Back to Projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  const tasks = project.linked_tasks || [];
  const meetings = project.linked_meetings || [];
  const milestones = project.milestones || [];
  const progressVal = project.calculated_progress !== undefined ? project.calculated_progress : (project.progress || 0);

  // Group tasks for Kanban
  const kanbanColumns = [
    { id: 'Pending', label: 'Pending', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
    { id: 'In Progress', label: 'In Progress', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
    { id: 'Completed', label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'Delayed', label: 'Delayed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
        <Link to="/projects" style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ArrowLeft size={14} />
          <span>Projects</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{project.key}</span>
      </div>

      {/* 2. Hero Project Overview Card */}
      <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                letterSpacing: '0.04em'
              }}>
                {project.key}
              </span>

              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  color: project.status === 'Completed' ? '#34d399' : '#38bdf8',
                  borderRadius: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="In Progress">In Progress</option>
                <option value="Planning">Planning</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>

              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: project.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: project.priority === 'High' ? '#f87171' : '#fbbf24'
              }}>
                {project.priority} Priority
              </span>
            </div>

            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.25
            }}>
              {project.name}
            </h1>

            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              margin: 0,
              maxWidth: '800px',
              lineHeight: 1.5
            }}>
              {project.description || 'Dedicated workspace coordinating deliverable deadlines, team meetings, and AI validations.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Plus size={15} />
              <span>Add Task</span>
            </button>

            <button
              onClick={openLinkMeetingModal}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <LinkIcon size={14} />
              <span>Link Meeting</span>
            </button>

            <Link
              to="/meetings/create"
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <Video size={14} color="#38bdf8" />
              <span>Launch Room</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#94a3b8' }}>
              Sprint Progress (Based on {tasks.length} tasks & {milestones.length} milestones)
            </span>
            <span style={{ fontWeight: 800, color: progressVal === 100 ? '#10b981' : '#38bdf8' }}>
              {progressVal}% Complete
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressVal}%`,
              height: '100%',
              background: progressVal === 100
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Key Metrics Footprint */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Project Lead</span>
            <strong style={{ color: '#f8fafc' }}>{project.lead_name}</strong>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Target Delivery</span>
            <strong style={{ color: '#f8fafc' }}>{project.target_date || 'Ongoing'}</strong>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Budget Allocation</span>
            <strong style={{ color: '#38bdf8' }}>{project.budget || 'N/A'}</strong>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Team Size</span>
            <strong style={{ color: '#f8fafc' }}>{(project.team_members || []).length} Members</strong>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'kanban', label: `Kanban Sprint (${tasks.length} Tasks)`, icon: CheckSquare },
          { id: 'milestones', label: `Milestones (${milestones.length})`, icon: Target },
          { id: 'meetings', label: `Linked Meetings (${meetings.length})`, icon: Video },
          { id: 'team', label: `Team Directory (${(project.team_members || []).length})`, icon: Users }
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
                padding: '0.5rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT: KANBAN SPRINT BOARD */}
      {activeTab === 'kanban' && (
        <div>
          {tasks.length === 0 ? (
            <EmptyState
              title="No Tasks in This Project"
              description="Add deliverables or action items to start the sprint board."
              actionText="Add Project Task"
              onAction={() => setIsTaskModalOpen(true)}
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              alignItems: 'start'
            }}>
              {kanbanColumns.map(col => {
                const colTasks = tasks.filter(t => (t.status || 'Pending').toLowerCase() === col.id.toLowerCase());

                return (
                  <div
                    key={col.id}
                    className="card"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      minHeight: '380px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)'
                    }}
                  >
                    {/* Column Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: col.color
                        }} />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                          {col.label}
                        </h4>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        backgroundColor: col.bg,
                        color: col.color
                      }}>
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Cards in Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {colTasks.map(task => {
                        const taskId = task.task_id || task.id || task._id;
                        return (
                          <div
                            key={taskId}
                            style={{
                              backgroundColor: '#1e293b',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.35 }}>
                                {task.task}
                              </span>
                              <PriorityBadge priority={task.priority} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                              <span>👤 {task.person || task.owner || 'Unassigned'}</span>
                              {task.deadline && <span>📅 {task.deadline}</span>}
                            </div>

                            {/* Move Status Selector */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '0.4rem',
                              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Move to:</span>
                              <select
                                value={task.status}
                                onChange={(e) => handleTaskStatusChange(taskId, e.target.value)}
                                style={{
                                  padding: '0.15rem 0.4rem',
                                  fontSize: '0.7rem',
                                  backgroundColor: '#0f172a',
                                  border: '1px solid var(--border-color)',
                                  color: '#cbd5e1',
                                  borderRadius: '4px',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Delayed">Delayed</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      {colTasks.length === 0 && (
                        <div style={{
                          padding: '1.5rem',
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          border: '1px dashed rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px'
                        }}>
                          Empty column
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT: MILESTONES & CHECKPOINTS */}
      {activeTab === 'milestones' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#f8fafc' }}>
                Project Milestones & Deliverable Checkpoints
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                Track delivery milestones and compliance checkpoints
              </p>
            </div>

            {/* Inline Add Milestone Form */}
            <form onSubmit={handleAddMilestone} style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Milestone title (e.g. Beta Release)..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                style={{
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  outline: 'none',
                  minWidth: '220px'
                }}
              />
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                style={{
                  padding: '0.4rem 0.55rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!newMilestoneTitle.trim()}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>
          </div>

          {milestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
              <Target size={36} color="#334155" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No milestones added yet.</div>
              <div style={{ fontSize: '0.78rem' }}>Add critical deliverables or phase checkpoints using the form above.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {milestones.map((ms, idx) => (
                <div
                  key={ms.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    backgroundColor: ms.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                    border: `1px solid ${ms.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleMilestone(ms.id, ms.completed)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: ms.completed ? '2px solid #10b981' : '2px solid #64748b',
                        backgroundColor: ms.completed ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {ms.completed && <Check size={13} strokeWidth={3} />}
                    </button>

                    <div>
                      <span style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: ms.completed ? '#64748b' : '#f8fafc',
                        textDecoration: ms.completed ? 'line-through' : 'none'
                      }}>
                        {ms.title}
                      </span>
                      {ms.due_date && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          Target: {ms.due_date}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      backgroundColor: ms.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                      color: ms.completed ? '#10b981' : '#38bdf8'
                    }}>
                      {ms.completed ? 'Achieved' : 'In Progress'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(ms.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '0.2rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                      title="Remove milestone"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT: LINKED MEETINGS & TRANSCRIPTS */}
      {activeTab === 'meetings' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#f8fafc' }}>
                Linked Meetings & Transcripts Hub
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                All WebRTC audio sessions and extracted commitments associated with this project
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={openLinkMeetingModal}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              >
                <LinkIcon size={13} />
                <span>Link Existing Meeting</span>
              </button>
              <Link
                to="/meetings/create"
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}
              >
                <Plus size={14} />
                <span>Start New Session</span>
              </Link>
            </div>
          </div>

          {meetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
              <Video size={36} color="#334155" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No meetings linked to this project yet.</div>
              <div style={{ fontSize: '0.78rem' }}>Link an existing meeting or host a live sprint standup.</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {meetings.map(m => {
                const code = m.meeting_code || m.id || m._id;
                return (
                  <div
                    key={m.id || m._id}
                    className="card card-hover"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                          {m.title || 'Live Sprint Session'}
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                          {code}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {m.summary || 'Real-time multi-peer speech meeting with automated Qwen3 commitment extraction.'}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '0.75rem'
                    }}>
                      <span style={{ color: '#64748b' }}>{m.date || 'Active Session'}</span>

                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              toast.info('Downloading MoM PDF...');
                              await exportMeetingMoMPDF(m.id || m._id, `MoM_${project.key}.pdf`);
                              toast.success('MoM PDF downloaded!');
                            } catch (e) {
                              toast.error('Download failed');
                            }
                          }}
                          style={{
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          MoM PDF
                        </button>

                        <Link
                          to={`/room/${code}`}
                          style={{
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          Join
                        </Link>

                        <Link
                          to={`/meetings/${m.id || m._id}`}
                          style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid var(--border-color)',
                            color: '#ffffff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            textDecoration: 'none'
                          }}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB CONTENT: TEAM DIRECTORY */}
      {activeTab === 'team' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: 700, color: '#f8fafc' }}>
            Initiative Team Directory
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            {(project.team_members || []).map((member, idx) => {
              const isLead = member.toLowerCase() === (project.lead_name || '').toLowerCase();
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isLead ? '#38bdf8' : '#8b5cf6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {member.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                        {member}
                      </span>
                      {isLead && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8'
                        }}>
                          Lead
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      Active Contributor
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. MODAL: Create Project Task */}
      {isTaskModalOpen && (
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
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1.25rem 0', fontWeight: 700, color: '#f8fafc' }}>
              Add Task to {project.key}
            </h2>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Task Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement WebSocket reconnection gateway"
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
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
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={taskForm.person}
                    onChange={(e) => setTaskForm({ ...taskForm, person: e.target.value })}
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
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
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
                    Initial Status
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
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
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
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
                  onClick={() => setIsTaskModalOpen(false)}
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: Link Meeting */}
      {isLinkMeetingModalOpen && (
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
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: 700, color: '#f8fafc' }}>
              Link Meeting to {project.key}
            </h2>

            <form onSubmit={handleLinkMeetingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Select Meeting from Workspace
                </label>
                <select
                  value={selectedMeetingId}
                  onChange={(e) => setSelectedMeetingId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {availableMeetings.map(m => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.title || 'Live Meeting'} ({m.meeting_code || m.id || m._id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLinkMeetingModalOpen(false)}
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
                  Link Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
