import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ListChecks, Trash2, ArrowRight, Video, FileDown } from 'lucide-react';
import { exportMeetingMoMPDF } from '../services/api';
import { toast } from 'react-toastify';

const MeetingCard = ({ meeting, onDelete }) => {
  const taskCount = meeting?.tasks?.length || 0;
  const roomCode = meeting?.meeting_code || meeting?.id;

  const [downloading, setDownloading] = useState(false);

  const handleDownloadMoM = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloading(true);
      toast.info('Downloading Minutes of Meeting (MoM) PDF...');
      const cleanTitle = (meeting?.title || 'Meeting').replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportMeetingMoMPDF(meeting.id, `MoM_${cleanTitle}.pdf`);
      toast.success('MoM PDF downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download MoM PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card card-hover" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      gap: '1.25rem'
    }}>
      <div>
        {/* Header Title & Date */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              {meeting.title || 'Untitled Meeting'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              <Calendar size={14} />
              <span>{meeting.date || 'No date'}</span>
              {meeting.meeting_code && (
                <>
                  <span>•</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{meeting.meeting_code}</span>
                </>
              )}
            </div>
          </div>

          <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <ListChecks size={12} />
            <span>{taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}</span>
          </span>
        </div>

        {/* Summary Snippet */}
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5
        }}>
          {meeting.summary || 'No summary available.'}
        </p>
      </div>

      {/* Footer Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onDelete(meeting)}
            className="btn btn-danger"
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            title="Delete Meeting"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>

          <button
            onClick={handleDownloadMoM}
            disabled={downloading}
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Download Minutes of Meeting (MoM) PDF"
          >
            <FileDown size={14} />
            <span>{downloading ? '...' : 'MoM PDF'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {roomCode && (
            <Link
              to={`/room/${roomCode}`}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              title="Join Live Meeting Room"
            >
              <Video size={14} color="var(--primary)" />
              <span>Join Room</span>
            </Link>
          )}

          <Link
            to={`/meetings/${meeting.id}`}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          >
            <span>Details</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
