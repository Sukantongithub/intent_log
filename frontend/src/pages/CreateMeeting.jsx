import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Loading from '../components/Loading';
import ConfirmModal from '../components/ConfirmModal';
import { createMeeting, scheduleMeeting } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Video, 
  Plus, 
  Keyboard, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Sparkles, 
  Bot, 
  ArrowRight, 
  Calendar as CalendarIcon,
  RefreshCw,
  FileText
} from 'lucide-react';

const CreateMeeting = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Google Meet Code / Link Join State
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Scheduled Modal State
  const [scheduledMeeting, setScheduledMeeting] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const sampleTranscript = `John will complete the React dashboard by Friday. Sarah will design the MongoDB database by Wednesday. David will test the backend API next Monday. The team should review the complete application next Friday.`;

  const handleStartInstantMeeting = async () => {
    try {
      setAnalyzing(true);
      const meeting = await scheduleMeeting({ title: 'Meeting Hall' });
      toast.success(`Created room with code: ${meeting.meeting_code}`);
      navigate(`/room/${meeting.meeting_code}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start instant meeting.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateLaterMeeting = async () => {
    try {
      const meeting = await scheduleMeeting({ title: 'Scheduled Meeting Hall' });
      setScheduledMeeting(meeting);
    } catch (err) {
      toast.error(err.message || 'Failed to schedule meeting.');
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      toast.warning('Please enter a valid meeting code or link.');
      return;
    }

    let code = joinCodeInput.trim();
    if (code.includes('/room/')) {
      code = code.split('/room/')[1];
    }

    toast.info(`Joining meeting room ${code}...`);
    navigate(`/room/${code}`);
  };

  const handleCopyScheduledLink = () => {
    if (scheduledMeeting?.share_url) {
      navigator.clipboard.writeText(scheduledMeeting.share_url);
      setCopiedLink(true);
      toast.success('Meeting link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleFillSample = () => {
    setTitle('Weekly AI Assistant Planning');
    setDate(today);
    setTranscript(sampleTranscript);
    toast.info('Sample transcript loaded.');
  };

  const handleSubmitTranscript = async (e) => {
    e.preventDefault();
    if (!title.trim() || !transcript.trim()) {
      toast.warning('Please enter title and transcript text.');
      return;
    }

    try {
      setAnalyzing(true);
      const result = await createMeeting({
        title: title.trim(),
        date: date || today,
        transcript: transcript.trim()
      });
      toast.success('Meeting analyzed and action items extracted successfully!');
      setCreatedMeeting(result);
    } catch (err) {
      toast.error(err.message || 'AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Google Meet Hero Landing Section */}
      <div className="card" style={{
        backgroundColor: '#0f172a',
        border: '1px solid var(--border-color)',
        padding: '2.5rem',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}>
            <Video size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700 }}>Google Meet AI Assistant</h1>
            <p style={{ color: 'var(--text-dim)', margin: '0.25rem 0 0 0', fontSize: '0.925rem' }}>
              Video calls, real-time live transcriptions, and automated Qwen3 action item extraction.
            </p>
          </div>
        </div>

        {/* Action Controls: New Meeting Dropdown & Join Code Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          
          {/* New Meeting Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem', borderRadius: '10px' }}
            >
              <Video size={20} />
              <span>New meeting</span>
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '105%',
                left: 0,
                width: '260px',
                backgroundColor: '#1e293b',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '0.5rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => { setShowDropdown(false); handleStartInstantMeeting(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <Sparkles size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Start an instant meeting</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Join room immediately</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowDropdown(false); handleCreateLaterMeeting(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <LinkIcon size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Create meeting for later</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Get shareable link</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Enter Code / Link Input Bar */}
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Keyboard size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Enter a code or link (e.g. abc-defg-hij)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                style={{ paddingLeft: '2.75rem', borderRadius: '10px', height: '46px' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={!joinCodeInput.trim()}
              style={{ height: '46px', padding: '0 1.25rem', borderRadius: '10px' }}
            >
              Join
            </button>
          </form>

        </div>
      </div>

      {/* Scheduled Meeting Link Modal */}
      {scheduledMeeting && (
        <div className="card" style={{
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LinkIcon size={22} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Here's your Meeting Hall link</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Share this code or link with people you want in the meeting.
                </p>
              </div>
            </div>
            <button onClick={() => setScheduledMeeting(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.65rem' }}>✕</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#0f172a', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--primary)' }}>
              {scheduledMeeting.share_url}
            </span>
            <button onClick={handleCopyScheduledLink} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
            <Link to={`/room/${scheduledMeeting.meeting_code}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              Join now
            </Link>
          </div>
        </div>
      )}

      {/* Or Offline Transcript Analysis Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Analyze Offline Meeting Transcript</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
              Or paste recorded transcript text below for AI action item extraction.
            </p>
          </div>
          <button onClick={handleFillSample} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>Load Sample Transcript</span>
          </button>
        </div>

        {analyzing && <Loading text="Qwen3 AI is analyzing meeting transcript..." fullScreen />}

        {createdMeeting ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <Bot size={18} />
                <h4 style={{ margin: 0 }}>AI Summary</h4>
              </div>
              <p style={{ color: 'var(--text-main)', margin: 0 }}>{createdMeeting.summary}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setCreatedMeeting(null)} className="btn btn-secondary">
                <RefreshCw size={16} />
                <span>Create Another</span>
              </button>
              <Link to={`/meetings/${createdMeeting.id}`} className="btn btn-primary">
                <span>View Action Items</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitTranscript} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Meeting Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Architecture Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Meeting Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Transcript Text *</label>
              <textarea
                className="form-textarea"
                placeholder="Paste text transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Bot size={18} />
                <span>Analyze Transcript</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};

export default CreateMeeting;
