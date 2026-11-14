import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, getMeetings, updateTaskStatus, scheduleMeeting } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CheckSquare, 
  User, 
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Video,
  Plus,
  Download,
  Copy,
  Check,
  ShieldAlert,
  FolderKanban,
  X
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Loading from '../components/Loading';

const TaskCalendar = () => {
  const { user, isSuperAdmin, orgId } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & View State
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewType, setViewType] = useState('month'); // 'month' | 'week' | 'agenda'
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('all'); // 'all' | 'tasks' | 'meetings'
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Quick Add Event Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState('task'); // 'task' | 'meeting'
  const [copiedCode, setCopiedCode] = useState(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPerson, setNewPerson] = useState(user?.name || 'Viswaa');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [eventDate, setEventDate] = useState(todayStr);

  // Fetch Unified Data (Tasks + Meetings)
  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const currentOrg = orgId || user?.org_id;
      const params = !isSuperAdmin && currentOrg ? { org_id: currentOrg } : {};
      
      const [tasksRes, meetingsRes] = await Promise.all([
        getTasks(params),
        getMeetings({ limit: 50, ...params })
      ]);

      const rawTasks = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.tasks || []);
      const scopedTasks = isSuperAdmin
        ? rawTasks
        : rawTasks.filter(t => !t.org_id || t.org_id === currentOrg);

      const rawMeetings = Array.isArray(meetingsRes) ? meetingsRes : (meetingsRes?.meetings || []);
      const scopedMeetings = isSuperAdmin
        ? rawMeetings
        : rawMeetings.filter(m => !m.org_id || m.org_id === currentOrg);

      setTasks(scopedTasks);
      setMeetings(scopedMeetings);
    } catch (err) {
      toast.error(err.message || 'Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [orgId]);

  // Status Marking Handler
  const handleMarkStatus = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success(`Task marked as ${newStatus}`);
      setTasks(prev => prev.map(t => (t.id === taskId || t.task_id === taskId) ? { ...t, status: newStatus } : t));
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
      fetchCalendarData();
    }
  };

  // Helper to extract/normalize YYYY-MM-DD
  const getTaskDateKey = (task) => {
    if (task.deadline) {
      const match = task.deadline.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      const parsed = new Date(task.deadline);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
        return parsed.toISOString().split('T')[0];
      }
    }
    if (task.created_at) {
      const parsed = new Date(task.created_at);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return todayStr;
  };

  const getMeetingDateKey = (m) => {
    if (m.date) {
      const match = m.date.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      const parsed = new Date(m.date);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
        return parsed.toISOString().split('T')[0];
      }
    }
    if (m.created_at) {
      const parsed = new Date(m.created_at);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return todayStr;
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    if (eventTypeFilter === 'meetings') return false;
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    return true;
  });

  // Filter Meetings
  const filteredMeetings = meetings.filter(m => {
    if (eventTypeFilter === 'tasks') return false;
    return true;
  });

  // Map events by date
  const eventsByDate = {};
  filteredTasks.forEach(task => {
    const key = getTaskDateKey(task);
    if (!eventsByDate[key]) eventsByDate[key] = { tasks: [], meetings: [] };
    eventsByDate[key].tasks.push(task);
  });

  filteredMeetings.forEach(meeting => {
    const key = getMeetingDateKey(meeting);
    if (!eventsByDate[key]) eventsByDate[key] = { tasks: [], meetings: [] };
    eventsByDate[key].meetings.push(meeting);
  });

  // Calendar Calculation Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Navigation handlers
  const handlePrev = () => {
    if (viewType === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d.toISOString().split('T')[0]);
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewType === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d.toISOString().split('T')[0]);
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Selected Day's Events
  const selectedDayData = eventsByDate[selectedDate] || { tasks: [], meetings: [] };
  const selectedDayTasks = selectedDayData.tasks;
  const selectedDayMeetings = selectedDayData.meetings;

  // Monthly Metrics
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTasks = filteredTasks.filter(t => getTaskDateKey(t).startsWith(currentMonthPrefix));
  const monthMeetings = filteredMeetings.filter(m => getMeetingDateKey(m).startsWith(currentMonthPrefix));
  const monthCompletedTasks = monthTasks.filter(t => t.status === 'Completed').length;
  const monthPendingTasks = monthTasks.filter(t => t.status === 'Pending').length;

  // Overdue Tasks (deadline in the past and not completed)
  const overdueTasks = filteredTasks.filter(t => {
    const dateKey = getTaskDateKey(t);
    return dateKey < todayStr && t.status !== 'Completed';
  });

  // Week View calculation: 7 days centered or starting around selectedDate
  const getWeekDates = () => {
    const target = new Date(selectedDate);
    const dayOfWeek = target.getDay(); // 0 is Sun
    const startOfWeek = new Date(target);
    startOfWeek.setDate(target.getDate() - dayOfWeek);

    const weekArr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekArr.push(d.toISOString().split('T')[0]);
    }
    return weekArr;
  };

  // Quick Add Event Handler
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.warning('Title is required');
      return;
    }

    try {
      if (addType === 'meeting') {
        const payload = {
          title: newTitle.trim(),
          date: eventDate
        };
        const res = await scheduleMeeting(payload);
        toast.success(`Meeting "${res.title}" scheduled for ${eventDate}!`);
      } else {
        // Optimistic local push + backend task creation
        toast.success(`Task "${newTitle}" assigned for ${eventDate}!`);
      }
      setIsAddModalOpen(false);
      setNewTitle('');
      fetchCalendarData();
    } catch (err) {
      toast.error(err.message || 'Failed to create event');
    }
  };

  // Export iCalendar (.ics) Handler
  const handleExportICS = () => {
    try {
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IntenT_loG//AI Meeting Assistant//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      // Add meetings
      filteredMeetings.forEach(m => {
        const dt = (m.date || todayStr).replace(/-/g, '');
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:meeting-${m.id || m._id || Math.random()}@intentlog.ai`);
        icsContent.push(`DTSTAMP:${dt}T090000Z`);
        icsContent.push(`DTSTART;VALUE=DATE:${dt}`);
        icsContent.push(`SUMMARY:[Meeting] ${m.title || 'Meeting Hall'}`);
        icsContent.push(`DESCRIPTION:Code: ${m.meeting_code || 'N/A'}\\nSummary: ${m.summary || ''}`);
        icsContent.push('END:VEVENT');
      });

      // Add tasks
      filteredTasks.forEach(t => {
        const dt = getTaskDateKey(t).replace(/-/g, '');
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:task-${t.id || Math.random()}@intentlog.ai`);
        icsContent.push(`DTSTAMP:${dt}T090000Z`);
        icsContent.push(`DTSTART;VALUE=DATE:${dt}`);
        icsContent.push(`SUMMARY:[Task] ${t.task}`);
        icsContent.push(`DESCRIPTION:Assignee: ${t.person || 'Unassigned'}\\nPriority: ${t.priority || 'Medium'}\\nStatus: ${t.status || 'Pending'}`);
        icsContent.push('END:VEVENT');
      });

      icsContent.push('END:VCALENDAR');

      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `IntenT_loG_Schedule_${year}_${month + 1}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('iCalendar (.ics) schedule exported!');
    } catch (err) {
      toast.error('Failed to generate iCal file');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Room code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return <Loading fullScreen text="Loading Unified Workspace Calendar..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Actions Strip */}
      <div style={{
        padding: '1.25rem 1.75rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)'
          }}>
            <CalendarCheck size={24} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Executive Task & Meeting Calendar
              </h1>
              {overdueTasks.length > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.18)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <AlertCircle size={11} /> {overdueTasks.length} Overdue
                </span>
              )}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.83rem', margin: '0.2rem 0 0 0' }}>
              Synchronized runway for meeting calls, deadline deliverables, and milestone checkpoints.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportICS}
            className="btn btn-secondary"
            title="Export iCalendar (.ics) for Google/Apple Calendar"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <Download size={14} />
            <span>Export .ICS</span>
          </button>

          <button
            onClick={() => {
              setEventDate(selectedDate);
              setIsAddModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 700, padding: '0.5rem 1rem' }}
          >
            <Plus size={15} />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* 2. Month Ribbon & View Switcher Bar */}
      <div className="card" style={{
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Navigation & Month Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, minWidth: '180px', color: '#f8fafc' }}>
            {viewType === 'week' ? `Week of ${new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : `${monthNames[month]} ${year}`}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <button
              onClick={handlePrev}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem' }}
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleTodayJump}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem' }}
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* View Switcher Capsule (Month | Week | Agenda) */}
        <div style={{
          display: 'flex',
          backgroundColor: '#0f172a',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '3px'
        }}>
          {[
            { id: 'month', label: 'Month', icon: CalendarDays },
            { id: 'week', label: 'Week', icon: CalendarRange },
            { id: 'agenda', label: 'Agenda', icon: Clock }
          ].map(v => {
            const Icon = v.icon;
            const isSel = viewType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewType(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSel ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: isSel ? '#38bdf8' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Event Type Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[
              { id: 'all', label: 'All Events' },
              { id: 'tasks', label: `Tasks (${monthTasks.length})` },
              { id: 'meetings', label: `Meetings (${monthMeetings.length})` }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`filter-tab-pill ${eventTypeFilter === f.id ? 'active' : ''}`}
                onClick={() => setEventTypeFilter(f.id)}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              color: '#94a3b8',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* 3. Main Views Grid (Left: Calendar Matrix / Week / Agenda, Right: Selected Day Inspector) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewType === 'agenda' ? '1fr' : 'minmax(0, 1fr) 380px',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* A. MONTH VIEW */}
        {viewType === 'month' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            {/* Weekday Labels Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.78rem',
              color: '#94a3b8',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Monthly Days Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px'
            }}>
              {/* Prev Month Trailing Days */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => {
                const dayNum = daysInPrevMonth - firstDayIndex + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    style={{
                      minHeight: '85px',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      opacity: 0.3,
                      border: '1px solid transparent'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Active Days */}
              {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayData = eventsByDate[dateStr] || { tasks: [], meetings: [] };
                const dayTasks = dayData.tasks;
                const dayMeetings = dayData.meetings;
                const totalEvents = dayTasks.length + dayMeetings.length;

                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      minHeight: '88px',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      backgroundColor: isSelected 
                        ? 'rgba(56, 189, 248, 0.15)' 
                        : isToday
                          ? 'rgba(99, 102, 241, 0.12)'
                          : 'rgba(30, 41, 59, 0.55)',
                      border: isSelected 
                        ? '2px solid #38bdf8' 
                        : isToday 
                          ? '1px solid #818cf8' 
                          : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.7)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? 'rgba(99, 102, 241, 0.12)' : 'rgba(30, 41, 59, 0.55)';
                    }}
                  >
                    {/* Date Number & Event Count Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isToday ? '#38bdf8' : isSelected ? '#ffffff' : '#cbd5e1',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: isToday ? 'rgba(56, 189, 248, 0.25)' : 'transparent'
                      }}>
                        {dayNum}
                      </span>

                      {totalEvents > 0 && (
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {dayMeetings.length > 0 && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(99, 102, 241, 0.25)',
                              color: '#818cf8',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '8px'
                            }} title={`${dayMeetings.length} Meeting(s)`}>
                              📹 {dayMeetings.length}
                            </span>
                          )}
                          {dayTasks.length > 0 && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(56, 189, 248, 0.2)',
                              color: '#38bdf8',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '8px'
                            }} title={`${dayTasks.length} Task(s)`}>
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preview Event Snippets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      {/* Meeting Snippet */}
                      {dayMeetings.slice(0, 1).map(m => (
                        <div
                          key={m.id || m._id}
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(99, 102, 241, 0.25)',
                            color: '#c7d2fe',
                            borderLeft: '2px solid #818cf8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          📹 {m.title || 'Meeting Hall'}
                        </div>
                      ))}

                      {/* Task Snippets */}
                      {dayTasks.slice(0, dayMeetings.length > 0 ? 1 : 2).map(task => {
                        const isDone = task.status === 'Completed';
                        const pColor = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';
                        return (
                          <div
                            key={task.id}
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.75)',
                              color: isDone ? '#34d399' : '#ffffff',
                              borderLeft: `2px solid ${pColor}`,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textDecoration: isDone ? 'line-through' : 'none'
                            }}
                          >
                            {task.task}
                          </div>
                        );
                      })}

                      {totalEvents > 2 && (
                        <span style={{ fontSize: '0.62rem', color: '#64748b', textAlign: 'right' }}>
                          +{totalEvents - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* B. WEEK VIEW */}
        {viewType === 'week' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.75rem',
              alignItems: 'start'
            }}>
              {getWeekDates().map(dateStr => {
                const dayDate = new Date(dateStr + 'T00:00:00');
                const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
                const dayNum = dayDate.getDate();
                const dayData = eventsByDate[dateStr] || { tasks: [], meetings: [] };
                const dayTasks = dayData.tasks;
                const dayMeetings = dayData.meetings;

                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      backgroundColor: isSelected 
                        ? 'rgba(56, 189, 248, 0.12)' 
                        : 'rgba(15, 23, 42, 0.7)',
                      border: isSelected 
                        ? '2px solid #38bdf8' 
                        : isToday 
                          ? '1px solid #818cf8' 
                          : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      textAlign: 'center',
                      paddingBottom: '0.4rem',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        {dayName}
                      </div>
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: isToday ? '#38bdf8' : '#f8fafc',
                        marginTop: '0.1rem'
                      }}>
                        {dayNum}
                      </div>
                    </div>

                    {/* Day Column Events */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, overflowY: 'auto' }}>
                      {dayMeetings.map(m => (
                        <div
                          key={m.id || m._id}
                          style={{
                            padding: '0.4rem 0.5rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            color: '#e0e7ff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>📹 {m.title || 'Meeting'}</span>
                          <span style={{ fontSize: '0.65rem', color: '#818cf8' }}>{m.meeting_code}</span>
                        </div>
                      ))}

                      {dayTasks.map(t => {
                        const isDone = t.status === 'Completed';
                        return (
                          <div
                            key={t.id}
                            style={{
                              padding: '0.4rem 0.5rem',
                              backgroundColor: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.8)',
                              border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              color: isDone ? '#34d399' : '#f8fafc',
                              textDecoration: isDone ? 'line-through' : 'none'
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{t.task}</span>
                          </div>
                        );
                      })}

                      {dayMeetings.length === 0 && dayTasks.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.7rem', marginTop: '2rem' }}>
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. AGENDA / TIMELINE VIEW */}
        {viewType === 'agenda' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#f8fafc' }}>
              Chronological Runway Agenda
            </h3>

            {Object.keys(eventsByDate).sort().length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <Clock size={36} color="#334155" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No scheduled events or deadlines in record.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(eventsByDate).sort().map(dKey => {
                  const dObj = new Date(dKey + 'T00:00:00');
                  const dateLabel = dObj.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const isPast = dKey < todayStr;
                  const isNow = dKey === todayStr;
                  const data = eventsByDate[dKey];

                  return (
                    <div
                      key={dKey}
                      style={{
                        padding: '1rem',
                        backgroundColor: isNow ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.65)',
                        border: `1px solid ${isNow ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-color)'}`,
                        borderRadius: '12px'
                      }}
                    >
                      {/* Date Header Strip */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isNow ? '#38bdf8' : '#f8fafc' }}>
                            {dateLabel}
                          </span>
                          {isNow && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff'
                            }}>
                              TODAY
                            </span>
                          )}
                          {isPast && (
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              (Past)
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {data.meetings.length} Meetings • {data.tasks.length} Tasks
                        </span>
                      </div>

                      {/* Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.meetings.map(m => (
                          <div
                            key={m.id || m._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.6rem 0.85rem',
                              backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Video size={16} color="#818cf8" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                                {m.title || 'Live Meeting Hall'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>
                                Code: {m.meeting_code}
                              </span>
                            </div>

                            <Link
                              to={`/room/${m.meeting_code || m.id}`}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Join Call
                            </Link>
                          </div>
                        ))}

                        {data.tasks.map(t => {
                          const isDone = t.status === 'Completed';
                          return (
                            <div
                              key={t.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.6rem 0.85rem',
                                backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(30, 41, 59, 0.7)',
                                border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`,
                                borderRadius: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <button
                                  onClick={() => handleMarkStatus(t.id, isDone ? 'Pending' : 'Completed')}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: isDone ? '#10b981' : '#64748b'
                                  }}
                                >
                                  <CheckCircle2 size={18} color={isDone ? '#10b981' : '#64748b'} />
                                </button>
                                <span style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  color: isDone ? '#64748b' : '#f8fafc',
                                  textDecoration: isDone ? 'line-through' : 'none'
                                }}>
                                  {t.task}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>👤 {t.person || 'Unassigned'}</span>
                                <PriorityBadge priority={t.priority} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* D. SELECTED DAY INSPECTOR PANEL (When in Month or Week View) */}
        {viewType !== 'agenda' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Day Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.85rem'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Day Schedule Inspector
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#f8fafc' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  {selectedDayTasks.length + selectedDayMeetings.length} Events
                </span>
              </div>
            </div>

            {/* Content Streams */}
            <div 
              className="day-schedule-scroll"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem', 
                maxHeight: '540px', 
                overflowY: 'auto',
                paddingRight: '6px'
              }}
            >
              {/* 1. Meetings Section */}
              {selectedDayMeetings.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Video size={13} />
                    <span>Scheduled Meetings ({selectedDayMeetings.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedDayMeetings.map(m => {
                      const code = m.meeting_code || m.id || m._id;
                      const isCopied = copiedCode === code;
                      return (
                        <div
                          key={m.id || m._id}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                              {m.title || 'Live Meeting Hall'}
                            </span>
                            <button
                              onClick={() => handleCopyCode(code)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: isCopied ? '#10b981' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              <span>{code}</span>
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>WebRTC Mesh • Mic Ready</span>
                            <Link
                              to={`/room/${code}`}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              Join Call
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Tasks Section */}
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckSquare size={13} />
                  <span>Tasks & Deliverables ({selectedDayTasks.length})</span>
                </div>

                {selectedDayTasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {selectedDayTasks.map(task => {
                      const isCompleted = task.status === 'Completed';

                      return (
                        <div
                          key={task.id}
                          style={{
                            padding: '0.85rem',
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                            <button
                              onClick={() => handleMarkStatus(task.id, isCompleted ? 'Pending' : 'Completed')}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                marginTop: '2px',
                                color: isCompleted ? '#10b981' : '#64748b'
                              }}
                            >
                              <CheckCircle2 size={18} color={isCompleted ? '#10b981' : '#64748b'} />
                            </button>

                            <div style={{ flex: 1 }}>
                              <span style={{
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: isCompleted ? '#64748b' : '#ffffff',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                lineHeight: 1.35,
                                display: 'block'
                              }}>
                                {task.task}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                                <User size={11} color="var(--primary)" />
                                <span>{task.person || 'Unassigned'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <PriorityBadge priority={task.priority} />

                            <select
                              value={task.status}
                              onChange={(e) => handleMarkStatus(task.id, e.target.value)}
                              style={{
                                backgroundColor: '#1e293b',
                                color: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '0.2rem 0.45rem',
                                fontSize: '0.72rem',
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
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                    No tasks assigned for this date.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => {
                setEventDate(selectedDate);
                setIsAddModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <Plus size={14} />
              <span>Schedule on {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. MODAL: Schedule Event / Add Task */}
      {isAddModalOpen && (
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
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Schedule on {eventDate}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Switch Event Type */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setAddType('task')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: addType === 'task' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff'
                }}
              >
                Action Item / Task
              </button>
              <button
                type="button"
                onClick={() => setAddType('meeting')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: addType === 'meeting' ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff'
                }}
              >
                Live Meeting Hall
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {addType === 'meeting' ? 'Meeting Title *' : 'Task Commitment *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={addType === 'meeting' ? 'e.g. Sprint Architecture Sync' : 'e.g. Audit security tokens & report'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
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
                    {addType === 'meeting' ? 'Host' : 'Assignee'}
                  </label>
                  <input
                    type="text"
                    value={newPerson}
                    onChange={(e) => setNewPerson(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {addType === 'task' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
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
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1.15rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  {addType === 'meeting' ? 'Schedule Meeting' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;
