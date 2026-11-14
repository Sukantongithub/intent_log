import React, { useState, useEffect } from 'react';
import { 
  Pin, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  Flame,
  Zap,
  Leaf,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

const STORAGE_KEY = 'intentlog_sticky_bento_notes';

const COLOR_OPTIONS = [
  { id: 'yellow', name: 'Yellow', bg: '#facc15', className: 'sticky-yellow' },
  { id: 'mint', name: 'Mint', bg: '#34d399', className: 'sticky-mint' },
  { id: 'sky', name: 'Sky', bg: '#38bdf8', className: 'sticky-sky' },
  { id: 'coral', name: 'Coral', bg: '#fb7185', className: 'sticky-coral' },
  { id: 'purple', name: 'Purple', bg: '#c084fc', className: 'sticky-purple' }
];

const DEFAULT_NOTES = [
  { 
    id: 'note-1', 
    text: 'Review deliverables for latest architecture review', 
    completed: false, 
    color: 'yellow', 
    priority: 'high',
    rotation: -1.2,
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'note-2', 
    text: 'Validate RAG semantic compliance on report PDF', 
    completed: true, 
    color: 'mint', 
    priority: 'medium',
    rotation: 1.4,
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'note-3', 
    text: 'Prepare agenda & invite for sprint sync meeting', 
    completed: false, 
    color: 'sky', 
    priority: 'low',
    rotation: -0.8,
    createdAt: new Date().toISOString() 
  }
];

const DashboardTodoList = ({ meetingTasks = [], user = null }) => {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_NOTES;
  });

  const [newText, setNewText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [newPriority, setNewPriority] = useState('medium');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }, [notes]);

  const handleAddNote = (e) => {
    if (e) e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;

    // slight random rotation between -2 and +2 degrees for organic sticky note look
    const randomRot = Number((Math.random() * 3.4 - 1.7).toFixed(1));

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: trimmed,
      completed: false,
      color: selectedColor,
      priority: newPriority,
      rotation: randomRot,
      createdAt: new Date().toISOString()
    };

    setNotes(prev => [newNote, ...prev]);
    setNewText('');
    toast.success('Pinned note to your board! 📌');
  };

  const toggleNote = (id) => {
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        const nextState = !n.completed;
        if (nextState) toast.success('Note completed! 🌟');
        return { ...n, completed: nextState };
      }
      return n;
    }));
  };

  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const clearCompleted = () => {
    const remaining = notes.filter(n => !n.completed);
    setNotes(remaining);
    toast.info('Completed notes unpinned');
  };

  // Sync action items from meetings
  const handleSyncFromMeetings = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (!meetingTasks || meetingTasks.length === 0) {
        toast.info('No meeting action items found to pin');
        return;
      }

      const relevant = meetingTasks.filter(task => {
        const isAssigned = !user?.name || !task.person || task.person.toLowerCase().includes(user.name.toLowerCase());
        const isPending = task.status !== 'Completed';
        return isPending && isAssigned;
      });

      if (relevant.length === 0) {
        toast.info('No pending meeting action items to import');
        return;
      }

      let addedCount = 0;
      const existingTexts = new Set(notes.map(n => n.text.toLowerCase()));
      const palette = ['sky', 'purple', 'mint', 'yellow', 'coral'];

      const newNotes = [];
      relevant.forEach((task, idx) => {
        const text = task.task || task.description;
        if (text && !existingTexts.has(text.toLowerCase())) {
          existingTexts.add(text.toLowerCase());
          const randomRot = Number((Math.random() * 3.4 - 1.7).toFixed(1));
          newNotes.push({
            id: `synced-${task.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: text,
            completed: false,
            color: palette[idx % palette.length],
            priority: (task.priority || 'medium').toLowerCase(),
            rotation: randomRot,
            fromMeeting: true,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        setNotes(prev => [...newNotes, ...prev]);
        toast.success(`Pinned ${addedCount} meeting action item(s)! 📌`);
      } else {
        toast.info('Meeting action items already exist on your board');
      }
    }, 400);
  };

  const filteredNotes = notes.filter(n => {
    if (filter === 'active') return !n.completed;
    if (filter === 'completed') return n.completed;
    return true;
  });

  const completedCount = notes.filter(n => n.completed).length;
  const activeCount = notes.length - completedCount;

  return (
    <div className="bento-board-panel">
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            transform: 'rotate(-5deg)'
          }}>
            <Pin size={17} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                margin: 0,
                color: '#f8fafc'
              }}>
                Sprint Bento Sticky Pad
              </h3>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                {completedCount}/{notes.length} Pinned
              </span>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncFromMeetings}
          disabled={isSyncing}
          title="Pin action items from live meetings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.38rem 0.75rem',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            cursor: isSyncing ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          <span>Sync Notes</span>
        </button>
      </div>

      {/* 2. Bento Quick Post Bar */}
      <form onSubmit={handleAddNote} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        marginBottom: '0.85rem',
        padding: '0.35rem 0.5rem',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        position: 'relative',
        zIndex: 1
      }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Write a sticky note & press Enter..."
          style={{
            flex: 1,
            padding: '0.35rem 0.6rem',
            fontSize: '0.8rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            outline: 'none'
          }}
        />

        {/* Color Palette Picker Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 4px' }}>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedColor(c.id)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: c.bg,
                border: selectedColor === c.id ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.4)',
                transform: selectedColor === c.id ? 'scale(1.2)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                padding: 0
              }}
              title={c.name}
            />
          ))}
        </div>

        {/* Priority Selector */}
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          style={{
            padding: '0.3rem 0.45rem',
            fontSize: '0.72rem',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            color: '#e2e8f0',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="high" style={{ backgroundColor: '#0f172a' }}>Urgent</option>
          <option value="medium" style={{ backgroundColor: '#0f172a' }}>Med</option>
          <option value="low" style={{ backgroundColor: '#0f172a' }}>Low</option>
        </select>

        {/* Pin Note Button */}
        <button
          type="submit"
          disabled={!newText.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.38rem 0.75rem',
            fontSize: '0.76rem',
            fontWeight: 700,
            borderRadius: '6px',
            background: newText.trim()
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'rgba(255, 255, 255, 0.06)',
            color: newText.trim() ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
            border: 'none',
            cursor: newText.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            boxShadow: newText.trim() ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none'
          }}
        >
          <Pin size={12} />
          <span>Pin</span>
        </button>
      </form>

      {/* 3. Filter Tape Pills & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'all', label: `All (${notes.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'completed', label: `Done (${completedCount})` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                border: `1px solid ${filter === f.id ? 'rgba(255, 255, 255, 0.25)' : 'transparent'}`,
                color: filter === f.id ? '#ffffff' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={clearCompleted}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.7rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.4rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            Clear done notes
          </button>
        )}
      </div>

      {/* 4. Bento Grid of Sticky Notes */}
      <div
        className="custom-scrollbar-thin"
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '235px',
          padding: '0.5rem 0.35rem 0.75rem 0.35rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        {filteredNotes.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            color: '#64748b',
            textAlign: 'center'
          }}>
            <Pin size={32} color="#334155" style={{ marginBottom: '0.5rem', transform: 'rotate(-20deg)' }} />
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
              {filter === 'completed'
                ? 'No completed notes yet.'
                : filter === 'active'
                  ? 'All notes are finished! 🌟'
                  : 'Board is empty. Pin a new note above!'}
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.85rem'
          }}>
            {filteredNotes.map(note => {
              const colorConfig = COLOR_OPTIONS.find(c => c.id === note.color) || COLOR_OPTIONS[0];

              return (
                <div
                  key={note.id}
                  className={`sticky-note-card ${colorConfig.className}`}
                  style={{
                    transform: `rotate(${note.rotation || 0}deg)`,
                    opacity: note.completed ? 0.7 : 1
                  }}
                  onClick={() => toggleNote(note.id)}
                  title="Click to toggle completed"
                >
                  {/* Washi Tape Accent */}
                  <div className="sticky-tape" />

                  {/* Stamp when completed */}
                  {note.completed && (
                    <div className="sticky-done-stamp">
                      DONE ✓
                    </div>
                  )}

                  {/* Note Body */}
                  <div style={{ marginTop: '0.35rem', marginBottom: '0.65rem' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.83rem',
                      fontWeight: 600,
                      lineHeight: 1.35,
                      textDecoration: note.completed ? 'line-through' : 'none',
                      color: note.completed ? 'rgba(255, 255, 255, 0.45)' : 'inherit',
                      wordBreak: 'break-word'
                    }}>
                      {note.text}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.45rem',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
                    fontSize: '0.7rem'
                  }}>
                    {/* Toggle check button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: note.completed ? '2px solid #10b981' : '2px solid rgba(255, 255, 255, 0.4)',
                        backgroundColor: note.completed ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        {note.completed && <Check size={10} strokeWidth={3} />}
                      </div>

                      {note.fromMeeting && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.08rem 0.3rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: '#bae6fd'
                        }}>
                          Meeting
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.2rem',
                        cursor: 'pointer',
                        color: 'rgba(255, 255, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                      title="Unpin note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTodoList;
