import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { getMeeting, validateMeeting } from '../services/api';
import { toast } from 'react-toastify';
import { 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  ArrowLeft, 
  Sparkles,
  Bot,
  Send
} from 'lucide-react';

const Validation = () => {
  const { id } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressUpdate, setProgressUpdate] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const data = await getMeeting(id);
      setMeeting(data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch meeting action items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMeetingData();
    }
  }, [id]);

  const sampleProgressUpdate = `John completed the frontend dashboard. Sarah has started the database design. David has not started testing yet.`;

  const handleFillSampleProgress = () => {
    setProgressUpdate(sampleProgressUpdate);
    toast.info('Sample progress update loaded.');
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!progressUpdate.trim()) {
      toast.warning('Please enter a progress update description.');
      return;
    }

    try {
      setValidating(true);
      const result = await validateMeeting(id, progressUpdate.trim());
      setValidationResult(result);
      toast.success('Task progress validated against meeting commitments!');
    } catch (err) {
      toast.error(err.message || 'Progress validation failed.');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return <Loading text="Loading meeting action items for validation..." />;
  }

  if (!meeting) {
    return (
      <EmptyState
        title="Meeting Not Found"
        description="Unable to find meeting for progress validation."
        actionText="Back to Meetings"
        actionLink="/meetings"
      />
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={`/meetings/${id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Meeting Details</span>
        </Link>
      </div>

      {/* Page Title */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-group">
          <h1>Validate Meeting Progress</h1>
          <p>Compare latest progress reports against original action items extracted from "{meeting.title}".</p>
        </div>
      </div>

      {/* Section 1: Original Action Items List */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Original Action Items ({meeting.tasks?.length || 0})</h3>
        </div>

        {meeting.tasks && meeting.tasks.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Task</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {meeting.tasks.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.person}</td>
                    <td>{t.task}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.deadline || '—'}</td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-dim)', margin: 0 }}>No original tasks recorded for this meeting.</p>
        )}
      </div>

      {/* Section 2: Progress Update Input Form */}
      <form onSubmit={handleValidate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label className="form-label" style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Enter Progress Update Text
          </label>
          <button type="button" onClick={handleFillSampleProgress} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>Load Sample Update</span>
          </button>
        </div>

        <textarea
          className="form-textarea"
          rows={5}
          placeholder={`Describe the latest task progress updates...\n\nExample:\n"John completed the frontend dashboard. Sarah has started the database design. David has not started testing."`}
          value={progressUpdate}
          onChange={(e) => setProgressUpdate(e.target.value)}
          required
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={validating}
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
          >
            <Bot size={20} />
            <span>{validating ? 'AI Validating Progress...' : 'Validate Progress'}</span>
          </button>
        </div>
      </form>

      {validating && <Loading text="AI is evaluating progress updates against original action items..." fullScreen />}

      {/* Section 3: AI Validation Result Cards */}
      {validationResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>AI Validation Report</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* 1. ✅ Completed Section */}
            <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#10b981' }}>
                <CheckCircle2 size={20} />
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#10b981' }}>
                  Completed Tasks ({validationResult.completed?.length || 0})
                </h3>
              </div>
              {validationResult.completed && validationResult.completed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {validationResult.completed.map((taskDesc, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 500, margin: 0 }}>{taskDesc}</p>
                      {validationResult.explanations?.[taskDesc] && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', margin: 0 }}>
                          {validationResult.explanations[taskDesc]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>No completed tasks identified.</p>
              )}
            </div>

            {/* 2. 🟡 Pending Section */}
            <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
                <Clock size={20} />
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#f59e0b' }}>
                  Pending / In Progress ({validationResult.pending?.length || 0})
                </h3>
              </div>
              {validationResult.pending && validationResult.pending.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {validationResult.pending.map((taskDesc, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 500, margin: 0 }}>{taskDesc}</p>
                      {validationResult.explanations?.[taskDesc] && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', margin: 0 }}>
                          {validationResult.explanations[taskDesc]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>No pending tasks identified.</p>
              )}
            </div>

            {/* 3. 🔴 Delayed Section */}
            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                <AlertCircle size={20} />
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#ef4444' }}>
                  Delayed Tasks ({validationResult.delayed?.length || 0})
                </h3>
              </div>
              {validationResult.delayed && validationResult.delayed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {validationResult.delayed.map((taskDesc, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 500, margin: 0 }}>{taskDesc}</p>
                      {validationResult.explanations?.[taskDesc] && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', margin: 0 }}>
                          {validationResult.explanations[taskDesc]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>No delayed tasks identified.</p>
              )}
            </div>

            {/* 4. ⚪ Unmentioned Section */}
            <div className="card" style={{ borderColor: 'rgba(100, 116, 139, 0.4)', backgroundColor: 'rgba(100, 116, 139, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#94a3b8' }}>
                <HelpCircle size={20} />
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#94a3b8' }}>
                  Unmentioned Tasks ({validationResult.unmentioned?.length || 0})
                </h3>
              </div>
              {validationResult.unmentioned && validationResult.unmentioned.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {validationResult.unmentioned.map((taskDesc, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                      <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 500, margin: 0 }}>{taskDesc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>All action items were mentioned in progress update.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Validation;
