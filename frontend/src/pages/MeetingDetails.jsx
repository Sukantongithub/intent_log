import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { getMeeting, updateTaskStatus, deleteMeeting, exportMeetingMoMPDF } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  Bot, 
  FileText, 
  CheckSquare, 
  FileCheck, 
  Trash2, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileDown,
  Download
} from 'lucide-react';

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchMeetingDetails = async () => {
    try {
      setLoading(true);
      const data = await getMeeting(id);
      setMeeting(data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch meeting details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMeetingDetails();
    }
  }, [id]);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Task status updated successfully.');
      fetchMeetingDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteMeeting = async () => {
    try {
      await deleteMeeting(id);
      toast.success('Meeting deleted successfully.');
      navigate('/meetings');
    } catch (err) {
      toast.error(err.message || 'Failed to delete meeting.');
    }
  };

  const [downloadingMoM, setDownloadingMoM] = useState(false);

  const handleExportMoMPDF = async () => {
    try {
      setDownloadingMoM(true);
      toast.info('Generating official Minutes of Meeting (MoM) PDF...');
      const cleanTitle = (meeting?.title || 'Meeting').replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportMeetingMoMPDF(id, `MoM_${cleanTitle}.pdf`);
      toast.success('Minutes of Meeting (MoM) PDF downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download MoM PDF.');
    } finally {
      setDownloadingMoM(false);
    }
  };


  if (loading) {
    return <Loading text="Loading meeting details..." />;
  }

  if (!meeting) {
    return (
      <EmptyState
        title="Meeting Not Found"
        description="The requested meeting could not be found or has been deleted."
        actionText="Back to Meetings"
        actionLink="/meetings"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/meetings" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Meetings</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportMoMPDF}
            disabled={downloadingMoM}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600
            }}
          >
            <FileDown size={18} />
            <span>{downloadingMoM ? 'Generating MoM...' : 'Export MoM PDF'}</span>
          </button>
          <Link to={`/validation/${id}`} className="btn btn-secondary">
            <FileCheck size={18} />
            <span>Validate Progress</span>
          </Link>
          <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
            <Trash2 size={16} />
            <span>Delete Meeting</span>
          </button>
        </div>
      </div>

      {/* Meeting Summary Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0' }}>{meeting.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              <Calendar size={16} />
              <span>Meeting Date: {meeting.date}</span>
              {meeting.meeting_code && (
                <>
                  <span>•</span>
                  <span>Room Code: <strong style={{ color: '#38bdf8' }}>{meeting.meeting_code}</strong></span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleExportMoMPDF}
            disabled={downloadingMoM}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Download size={15} />
            <span>{downloadingMoM ? 'Downloading...' : 'One-Click MoM PDF'}</span>
          </button>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            <Bot size={18} />
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>AI Meeting Summary</h4>
          </div>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.6, margin: 0, fontSize: '0.925rem' }}>
            {meeting.summary}
          </p>
        </div>

        {/* Toggleable Transcript Section */}
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: 0
            }}
          >
            <FileText size={16} />
            <span>{showTranscript ? 'Hide Raw Transcript' : 'View Raw Transcript'}</span>
            {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTranscript && (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              whiteSpace: 'pre-wrap',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {meeting.transcript}
            </div>
          )}
        </div>
      </div>

      {/* Action Items Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Action Items ({meeting.tasks?.length || 0})</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Tasks extracted by LLM. Change status using dropdowns below.</p>
          </div>
        </div>

        {meeting.tasks && meeting.tasks.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Responsible Person</th>
                  <th>Task Description</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {meeting.tasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 600 }}>{task.person}</td>
                    <td>{task.task}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{task.deadline || '—'}</td>
                    <td><PriorityBadge priority={task.priority} /></td>
                    <td><StatusBadge status={task.status} /></td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No action items found"
            description="No tasks were extracted for this meeting."
          />
        )}
      </div>

      {/* Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${meeting.title}"? All associated tasks will also be removed.`}
        onConfirm={handleDeleteMeeting}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default MeetingDetails;
