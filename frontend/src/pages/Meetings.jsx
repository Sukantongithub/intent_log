import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { getMeetings, deleteMeeting, scheduleMeeting, exportMeetingMoMPDF } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Search, 
  Plus, 
  Video, 
  Disc, 
  Sliders, 
  Table as TableIcon, 
  Calendar, 
  ListChecks, 
  Trash2, 
  ArrowRight, 
  FileDown, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink,
  Flame,
  Clock,
  ArrowUpDown,
  Radio,
  Play,
  Volume2,
  CheckCircle2,
  Layers,
  ChevronRight,
  User,
  ShieldCheck
} from 'lucide-react';

const Meetings = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'tasks' | 'this_week'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'tasks'
  const [viewMode, setViewMode] = useState('console'); // 'console' (Studio Console) | 'tapes' (Cassette Vault) | 'table' (Data Matrix)
  
  // Selected Meeting for Master Studio Deck
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  // Instant Launch & Join Code State
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isStartingInstant, setIsStartingInstant] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await getMeetings({ page: 1, limit: 100 });
      const list = data.meetings || [];
      setMeetings(list);
      if (list.length > 0 && !selectedMeetingId) {
        setSelectedMeetingId(list[0].id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch meetings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCopyCode = (code, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied room code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadMoM = async (meeting, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setDownloadingId(meeting.id);
      toast.info('Downloading Minutes of Meeting (MoM) PDF...');
      const cleanTitle = (meeting?.title || 'Meeting').replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportMeetingMoMPDF(meeting.id, `MoM_${cleanTitle}.pdf`);
      toast.success('MoM PDF downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to download MoM PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting(deleteTarget.id);
      toast.success('Meeting deleted successfully.');
      const remaining = meetings.filter(m => m.id !== deleteTarget.id);
      setDeleteTarget(null);
      setMeetings(remaining);
      if (selectedMeetingId === deleteTarget.id) {
        setSelectedMeetingId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete meeting.');
    }
  };

  const handleStartInstantMeeting = async () => {
    try {
      setIsStartingInstant(true);
      const res = await scheduleMeeting({ title: 'Live Meeting Hall' });
      toast.success(`Created live hall: ${res.meeting_code}`);
      navigate(`/room/${res.meeting_code}`);
    } catch (err) {
      toast.error(err.message || 'Failed to initialize instant meeting.');
    } finally {
      setIsStartingInstant(false);
    }
  };

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().replace(/^https?:\/\/[^/]+\/room\//, '').replace(/^room\//, '');
    if (!clean) {
      toast.warn('Please enter a valid room code.');
      return;
    }
    navigate(`/room/${clean}`);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = meetings.length;
    const totalTasks = meetings.reduce((acc, m) => acc + (m.tasks?.length || 0), 0);
    const withTasksCount = meetings.filter(m => (m.tasks?.length || 0) > 0).length;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thisWeekCount = meetings.filter(m => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return !isNaN(d) && d >= sevenDaysAgo;
    }).length;

    return { total, totalTasks, withTasksCount, thisWeekCount };
  }, [meetings]);

  // Filtering & Sorting
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter(m => {
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchTitle = (m.title || '').toLowerCase().includes(q);
          const matchSummary = (m.summary || '').toLowerCase().includes(q);
          const matchCode = (m.meeting_code || '').toLowerCase().includes(q);
          const matchTask = (m.tasks || []).some(t => 
            (t.description || '').toLowerCase().includes(q) || 
            (t.assigned_to || '').toLowerCase().includes(q)
          );
          if (!matchTitle && !matchSummary && !matchCode && !matchTask) return false;
        }

        if (activeFilter === 'tasks') {
          return (m.tasks?.length || 0) > 0;
        }
        if (activeFilter === 'this_week') {
          if (!m.date) return false;
          const d = new Date(m.date);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return !isNaN(d) && d >= sevenDaysAgo;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date || 0) - new Date(a.date || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.date || 0) - new Date(b.date || 0);
        }
        if (sortBy === 'tasks') {
          return (b.tasks?.length || 0) - (a.tasks?.length || 0);
        }
        return 0;
      });
  }, [meetings, searchQuery, activeFilter, sortBy]);

  // Active meeting on Master Deck
  const activeMeeting = useMemo(() => {
    if (!selectedMeetingId) {
      return filteredMeetings.length > 0 ? filteredMeetings[0] : null;
    }
    const found = meetings.find(m => m.id === selectedMeetingId);
    return found || (filteredMeetings.length > 0 ? filteredMeetings[0] : null);
  }, [selectedMeetingId, meetings, filteredMeetings]);

  if (loading) {
    return <Loading text="Loading meetings console..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Header Command Deck */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.25rem'
      }}>
        {/* Title & Status Orb */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Meetings Overview
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Radio size={11} className="pulse-slow" />
              <span>{metrics.total} Sessions</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            <span><strong>{metrics.totalTasks}</strong> Action Items Extracted</span>
            <span>•</span>
            <span><strong>{metrics.withTasksCount}</strong> Productive Sessions</span>
            <span>•</span>
            <span><strong>{metrics.thisWeekCount}</strong> Active This Week</span>
          </div>
        </div>

        {/* Quick Launch Bay */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Quick Join Code Input */}
          <form 
            onSubmit={handleJoinWithCode}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#0f172a', 
              border: '1px solid var(--border-color)', 
              borderRadius: '10px', 
              padding: '0.2rem 0.35rem' 
            }}
          >
            <input
              type="text"
              placeholder="Enter room code..."
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                padding: '0.35rem 0.6rem',
                outline: 'none',
                width: '130px'
              }}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Join
            </button>
          </form>

          {/* Instant Room Button */}
          <button
            onClick={handleStartInstantMeeting}
            disabled={isStartingInstant}
            className="btn"
            style={{
              padding: '0.55rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer'
            }}
          >
            <Play size={14} fill="#38bdf8" />
            <span>{isStartingInstant ? 'Launching...' : 'Instant Room'}</span>
          </button>

          {/* New Meeting Analysis Button */}
          <Link 
            to="/meetings/create" 
            className="btn btn-primary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>New Meeting</span>
          </Link>
        </div>
      </div>

      {/* 2. Control & Style Switcher Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search & Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 360px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search meetings, tasks, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { id: 'all', label: `All (${metrics.total})` },
              { id: 'tasks', label: `With Tasks (${metrics.withTasksCount})` },
              { id: 'this_week', label: `This Week (${metrics.thisWeekCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeFilter === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeFilter === tab.id ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style View Toggle & Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <ArrowUpDown size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid var(--border-color)',
                color: '#ffffff',
                padding: '0.35rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="tasks">Most Tasks</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '2px',
            gap: '2px'
          }}>
            <button
              onClick={() => setViewMode('console')}
              title="Studio Console (Master Deck & Live Reel)"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'console' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'console' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <Sliders size={13} />
              <span>Console</span>
            </button>

            <button
              onClick={() => setViewMode('tapes')}
              title="Audio Tape Vault"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'tapes' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'tapes' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <Disc size={13} />
              <span>Tapes</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              title="Data Table View"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <TableIcon size={13} />
              <span>Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Views */}
      {filteredMeetings.length === 0 ? (
        searchQuery ? (
          <EmptyState
            title="No matching meetings"
            description={`No meetings match query "${searchQuery}".`}
            icon={Search}
          />
        ) : (
          <EmptyState
            title="No meetings recorded yet"
            description="Launch a live hall or paste a transcript to begin automated commitment extraction."
            actionText="Start Instant Meeting"
            actionLink="/meetings/create"
            icon={Video}
          />
        )
      ) : viewMode === 'console' ? (
        /* ================= STYLE 1: MASTER STUDIO CONSOLE (REEL + DECK) ================= */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          gap: '1.25rem',
          alignItems: 'start'
        }}>
          {/* Left Column: The Meeting Reels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            maxHeight: '740px',
            overflowY: 'auto',
            paddingRight: '4px'
          }} className="day-schedule-scroll">
            {filteredMeetings.map((meeting) => {
              const isSelected = activeMeeting?.id === meeting.id;
              const taskCount = meeting.tasks?.length || 0;
              const code = meeting.meeting_code || meeting.id;
              const isCopied = copiedCode === code;

              return (
                <div
                  key={meeting.id}
                  onClick={() => setSelectedMeetingId(meeting.id)}
                  className={`studio-reel-item ${isSelected ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                        {meeting.date || 'Recorded'}
                      </span>
                      {meeting.meeting_code && (
                        <button
                          onClick={(e) => handleCopyCode(meeting.meeting_code, e)}
                          title="Click to copy code"
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: isCopied ? '#34d399' : '#38bdf8',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          <span>{meeting.meeting_code}</span>
                        </button>
                      )}
                    </div>

                    {/* Animated Equalizer when Selected */}
                    {isSelected ? (
                      <div className="equalizer-container" title="Active Audio Reel">
                        <div className="equalizer-bar bar-1"></div>
                        <div className="equalizer-bar bar-2"></div>
                        <div className="equalizer-bar bar-3"></div>
                        <div className="equalizer-bar bar-4"></div>
                        <div className="equalizer-bar bar-5"></div>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: taskCount > 0 ? '#38bdf8' : '#94a3b8'
                      }}>
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  <h3 style={{
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    margin: '0 0 0.35rem 0',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    lineHeight: 1.3
                  }}>
                    {meeting.title || 'Untitled Meeting'}
                  </h3>

                  <p style={{
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    margin: 0,
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {meeting.summary || 'Click to load transcription analysis, speaker records, and commitments.'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Master Studio Deck */}
          {activeMeeting ? (
            <div className="studio-master-deck">
              {/* Deck Top Bar: Audio Wave Indicator & Metadata */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}>
                      <Volume2 size={13} />
                      <span>MASTER AUDIO REEL</span>
                    </div>

                    <div className="equalizer-container">
                      <div className="equalizer-bar bar-1"></div>
                      <div className="equalizer-bar bar-2"></div>
                      <div className="equalizer-bar bar-3"></div>
                      <div className="equalizer-bar bar-4"></div>
                      <div className="equalizer-bar bar-5"></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeMeeting.meeting_code && (
                      <button
                        onClick={(e) => handleCopyCode(activeMeeting.meeting_code, e)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: copiedCode === activeMeeting.meeting_code ? '#34d399' : '#38bdf8',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {copiedCode === activeMeeting.meeting_code ? <Check size={12} /> : <Copy size={12} />}
                        <span>CODE: {activeMeeting.meeting_code}</span>
                      </button>
                    )}

                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {activeMeeting.date || 'Recorded Session'}
                    </span>
                  </div>
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                  {activeMeeting.title || 'Untitled Meeting'}
                </h2>
              </div>

              {/* Tape Summary Deck */}
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '1.1rem'
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={13} />
                  <span>AI Executive Takeaway</span>
                </div>
                <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                  {activeMeeting.summary || 'Summary ready for review. Inspect extracted commitments and deliverables below.'}
                </p>
              </div>

              {/* Extracted Commitments Tracklist */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ListChecks size={15} />
                    <span>Commitments Tracklist ({activeMeeting.tasks?.length || 0})</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Auto-extracted by Qwen-3
                  </span>
                </div>

                {activeMeeting.tasks && activeMeeting.tasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }} className="day-schedule-scroll">
                    {activeMeeting.tasks.map((task, idx) => (
                      <div
                        key={task.id || idx}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1 }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px'
                          }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.35 }}>
                            {task.description || task.task}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          {task.assigned_to && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <User size={10} />
                              <span>{task.assigned_to}</span>
                            </span>
                          )}

                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: task.status === 'Completed' ? '#34d399' : '#fbbf24'
                          }}>
                            {task.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '0.8rem'
                  }}>
                    No action items extracted for this session.
                  </div>
                )}
              </div>

              {/* Master Actions Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
                gap: '0.65rem'
              }}>
                <button
                  onClick={() => setDeleteTarget(activeMeeting)}
                  className="btn"
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => handleDownloadMoM(activeMeeting, e)}
                    disabled={downloadingId === activeMeeting.id}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <FileDown size={14} color="#38bdf8" />
                    <span>{downloadingId === activeMeeting.id ? 'Generating...' : 'Export MoM PDF'}</span>
                  </button>

                  {activeMeeting.meeting_code && (
                    <Link
                      to={`/room/${activeMeeting.meeting_code}`}
                      className="btn"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Video size={14} />
                      <span>Join Live Hall</span>
                    </Link>
                  )}

                  <Link
                    to={`/meetings/${activeMeeting.id}`}
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>Full Transcript</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : viewMode === 'tapes' ? (
        /* ================= STYLE 2: AUDIO CASSETTE TAPE VAULT ================= */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredMeetings.map((meeting) => {
            const taskCount = meeting.tasks?.length || 0;
            const code = meeting.meeting_code || meeting.id;
            const isCopied = copiedCode === code;
            const isDownloading = downloadingId === meeting.id;

            return (
              <div key={meeting.id} className="audio-cassette-card">
                <div>
                  {/* Cassette Top Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Disc size={14} color="#38bdf8" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em' }}>
                        TAPE ARCHIVE
                      </span>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {meeting.date || 'Date N/A'}
                    </span>
                  </div>

                  <Link to={`/meetings/${meeting.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      margin: '0 0 0.5rem 0',
                      color: '#ffffff',
                      lineHeight: 1.3
                    }}>
                      {meeting.title || 'Untitled Session'}
                    </h3>
                  </Link>

                  {/* Cassette Tape Spool Window */}
                  <div className="tape-window">
                    <div className="tape-spool"></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {meeting.meeting_code ? (
                        <button
                          onClick={(e) => handleCopyCode(meeting.meeting_code, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isCopied ? '#34d399' : '#38bdf8',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{meeting.meeting_code}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>VOICE MEMO</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        {taskCount} {taskCount === 1 ? 'Commitment' : 'Commitments'}
                      </span>
                    </div>
                    <div className="tape-spool"></div>
                  </div>

                  <p style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    lineHeight: 1.45,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {meeting.summary || 'Summary ready.'}
                  </p>
                </div>

                {/* Cassette Footer Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  marginTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <button
                    onClick={() => setDeleteTarget(meeting)}
                    className="btn"
                    title="Delete Tape"
                    style={{
                      padding: '0.35rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={(e) => handleDownloadMoM(meeting, e)}
                      disabled={isDownloading}
                      className="btn"
                      style={{
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <FileDown size={13} color="#38bdf8" />
                      <span>{isDownloading ? 'PDF...' : 'MoM'}</span>
                    </button>

                    {meeting.meeting_code && (
                      <Link
                        to={`/room/${meeting.meeting_code}`}
                        className="btn"
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Video size={13} />
                        <span>Room</span>
                      </Link>
                    )}

                    <Link
                      to={`/meetings/${meeting.id}`}
                      className="btn btn-primary"
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Play</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= STYLE 3: DATA MATRIX TABLE ================= */
        <div className="meeting-table-wrapper">
          <table className="meeting-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Meeting Title</th>
                <th>Room Code</th>
                <th>Commitments</th>
                <th>Executive Summary</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((meeting) => {
                const taskCount = meeting.tasks?.length || 0;
                const code = meeting.meeting_code || meeting.id;
                const isCopied = copiedCode === code;

                return (
                  <tr key={meeting.id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.78rem' }}>
                      {meeting.date || 'N/A'}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      <Link to={`/meetings/${meeting.id}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                        {meeting.title || 'Untitled Meeting'}
                      </Link>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {meeting.meeting_code ? (
                        <button
                          onClick={(e) => handleCopyCode(meeting.meeting_code, e)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: isCopied ? '#34d399' : '#38bdf8',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{meeting.meeting_code}</span>
                        </button>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '10px',
                        backgroundColor: taskCount > 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        color: taskCount > 0 ? '#38bdf8' : '#64748b',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {taskCount}
                      </span>
                    </td>
                    <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                      {meeting.summary || 'No summary'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={(e) => handleDownloadMoM(meeting, e)}
                          title="Export MoM PDF"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            padding: '0.2rem'
                          }}
                        >
                          <FileDown size={15} />
                        </button>

                        {meeting.meeting_code && (
                          <Link
                            to={`/room/${meeting.meeting_code}`}
                            title="Enter Live Room"
                            style={{ color: '#34d399', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                          >
                            <Video size={15} />
                          </Link>
                        )}

                        <button
                          onClick={() => setDeleteTarget(meeting)}
                          title="Delete Meeting"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.2rem'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>

                        <Link
                          to={`/meetings/${meeting.id}`}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 600 }}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? All associated action items will also be removed.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Meetings;
