import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import DeliverableUploadModal from '../components/DeliverableUploadModal';
import { getTasks, updateTaskStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Filter, 
  User, 
  Search, 
  CheckSquare, 
  CalendarCheck,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  FileText
} from 'lucide-react';

const Tasks = () => {
  const { user, isSuperAdmin, orgId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [personFilter, setPersonFilter] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // Deliverable modal state
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (priorityFilter !== 'All') params.priority = priorityFilter;
      if (personFilter.trim()) params.person = personFilter.trim();

      const currentOrg = orgId || user?.org_id;
      if (!isSuperAdmin && currentOrg) {
        params.org_id = currentOrg;
      }

      const data = await getTasks(params);
      let rawTasks = Array.isArray(data) ? data : (data?.tasks || []);
      let filtered = isSuperAdmin
        ? rawTasks
        : rawTasks.filter(t => !t.org_id || t.org_id === currentOrg);

      if (myTasksOnly && user?.name) {
        const uName = user.name.toLowerCase();
        filtered = filtered.filter(t => {
          const p = (t.person || '').toLowerCase();
          return p.includes(uName) || uName.includes(p);
        });
      }

      setTasks(filtered);

      // Deep linking via ?task=TASK_ID query param
      const targetTaskId = searchParams.get('task') || searchParams.get('open');
      if (targetTaskId) {
        const matched = filtered.find(t => (t.id === targetTaskId || t.task_id === targetTaskId));
        if (matched) {
          setSelectedTaskForModal(matched);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, orgId, myTasksOnly]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Task status updated successfully.');
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  const handlePersonSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleOpenDeliverableModal = (task) => {
    setSelectedTaskForModal(task);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ margin: 0 }}>Action Items & Deliverables</h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              AI Verification Enabled
            </span>
          </div>
          <p>
            Track commitments, upload deliverable files (PDF/DOCX/TXT/XLSX), and run autonomous AI criteria audits.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              backgroundColor: myTasksOnly ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
              border: myTasksOnly ? '1.5px solid #38bdf8' : '1px solid var(--border-color)',
              color: myTasksOnly ? '#38bdf8' : '#cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={16} />
            <span>{myTasksOnly ? 'Showing My Tasks' : 'Filter My Tasks'}</span>
          </button>

          <Link to="/calendar" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck size={18} color="var(--primary)" />
            <span>Calendar View</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handlePersonSearchSubmit} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          {/* Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Filter Status
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Filter Priority
            </label>
            <select
              className="form-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Person Filter Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Responsible Person
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search person (e.g. Viswaa)..."
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Tasks Table Section */}
      {loading ? (
        <Loading text="Filtering action items..." />
      ) : tasks.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Responsible Person</th>
                  <th>Task & Target Deliverable</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Deliverable & AI Audit</th>
                  <th>Manual Override</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const taskId = task.task_id || task.id;
                  const isCompleted = task.status === 'Completed';

                  return (
                    <tr key={task.id || taskId}>
                      {/* Responsible Person */}
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: (task.person || '').toLowerCase().includes('viswaa') ? 'rgba(56, 189, 248, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: (task.person || '').toLowerCase().includes('viswaa') ? '#38bdf8' : '#818cf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {(task.person || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span>{task.person}</span>
                        </div>
                      </td>

                      {/* Task Description & Deliverable */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {task.task}
                        </div>
                        {task.deliverable && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#38bdf8' }}>
                            <FileText size={13} />
                            <span>Target: {task.deliverable}</span>
                          </div>
                        )}
                      </td>

                      {/* Deadline */}
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {task.deadline || '—'}
                      </td>

                      {/* Priority */}
                      <td><PriorityBadge priority={task.priority} /></td>

                      {/* Status */}
                      <td><StatusBadge status={task.status} /></td>

                      {/* Deliverable & AI Audit Action Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDeliverableModal(task)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                            border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.35)',
                            color: isCompleted ? '#10b981' : '#38bdf8',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            cursor: 'pointer',
                            boxShadow: isCompleted ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(56, 189, 248, 0.15)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {isCompleted ? (
                            <>
                              <ShieldCheck size={15} color="#10b981" />
                              <span>Verified (Audit)</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={15} color="#38bdf8" />
                              <span>Upload & Verify</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Status Dropdown */}
                      <td>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#0f172a',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Delayed">Delayed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No action items found"
          description="No tasks match the selected filter criteria."
          icon={CheckSquare}
        />
      )}

      {/* Deliverable Upload & Verification Modal */}
      {selectedTaskForModal && (
        <DeliverableUploadModal
          task={selectedTaskForModal}
          isOpen={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
};

export default Tasks;
