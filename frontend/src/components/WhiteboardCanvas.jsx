import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PenTool, 
  Square, 
  Circle, 
  Minus, 
  MoveRight, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Palette,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

const COLOR_PALETTE = [
  { name: 'White', value: '#ffffff' },
  { name: 'Cyan', value: '#38bdf8' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#a855f7' }
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Bold', value: 9 }
];

export const WhiteboardCanvas = ({
  signalingWs,
  initialHistory = [],
  initialNotes = '',
  currentUser,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'notes'
  
  // Drawing Canvas State
  const [currentTool, setCurrentTool] = useState('pen'); // 'pen' | 'line' | 'rect' | 'circle' | 'arrow' | 'eraser'
  const [currentColor, setCurrentColor] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [strokes, setStrokes] = useState(initialHistory || []);
  
  // Shared Notes State
  const [notes, setNotes] = useState(initialNotes || '');
  const [notesCopied, setNotesCopied] = useState(false);
  const notesTimeoutRef = useRef(null);

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  // Sync incoming strokes and notes when props update
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0 && strokes.length === 0) {
      setStrokes(initialHistory);
    }
  }, [initialHistory]);

  useEffect(() => {
    if (initialNotes && !notes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set dark background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Optional: Draw subtle grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const dotSpacing = 28;
    for (let x = dotSpacing; x < canvas.width; x += dotSpacing) {
      for (let y = dotSpacing; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render all saved strokes
    strokes.forEach(stroke => {
      drawStroke(ctx, stroke);
    });

    // Render active in-progress stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes]);

  // Helper to draw an individual stroke or shape
  const drawStroke = (ctx, stroke) => {
    if (!stroke) return;
    ctx.save();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#090d16' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    } else if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(stroke.startX, stroke.startY);
      ctx.lineTo(stroke.endX, stroke.endY);
      ctx.stroke();
    } else if (stroke.tool === 'rect') {
      ctx.beginPath();
      const width = stroke.endX - stroke.startX;
      const height = stroke.endY - stroke.startY;
      ctx.strokeRect(stroke.startX, stroke.startY, width, height);
    } else if (stroke.tool === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(
        Math.pow(stroke.endX - stroke.startX, 2) + Math.pow(stroke.endY - stroke.startY, 2)
      );
      ctx.arc(stroke.startX, stroke.startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(stroke.startX, stroke.startY);
      ctx.lineTo(stroke.endX, stroke.endY);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(stroke.endY - stroke.startY, stroke.endX - stroke.startX);
      const headLen = stroke.width * 3.5 + 8;
      ctx.beginPath();
      ctx.moveTo(stroke.endX, stroke.endY);
      ctx.lineTo(
        stroke.endX - headLen * Math.cos(angle - Math.PI / 6),
        stroke.endY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(stroke.endX, stroke.endY);
      ctx.lineTo(
        stroke.endX - headLen * Math.cos(angle + Math.PI / 6),
        stroke.endY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  // Resize canvas to fill container with proper pixel ratio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, redrawCanvas]);

  // Pointer event handlers for cross-platform drawing
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentStrokeRef.current = {
        id: 'stroke_' + Math.random().toString(36).substr(2, 9),
        tool: currentTool,
        color: currentColor,
        width: strokeWidth,
        points: [{ x, y }]
      };
    } else {
      currentStrokeRef.current = {
        id: 'shape_' + Math.random().toString(36).substr(2, 9),
        tool: currentTool,
        color: currentColor,
        width: strokeWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y
      };
    }
    redrawCanvas();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentStrokeRef.current.points.push({ x, y });
    } else {
      currentStrokeRef.current.endX = x;
      currentStrokeRef.current.endY = y;
    }
    redrawCanvas();
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    // Append to local strokes
    setStrokes(prev => [...prev, finishedStroke]);

    // Broadcast stroke to peers in the room
    if (signalingWs && signalingWs.readyState === WebSocket.OPEN) {
      signalingWs.send(JSON.stringify({
        type: 'whiteboard_draw',
        stroke: finishedStroke
      }));
    }
  };

  // Undo local stroke
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
  };

  // Clear whiteboard canvas
  const handleClear = () => {
    setStrokes([]);
    if (signalingWs && signalingWs.readyState === WebSocket.OPEN) {
      signalingWs.send(JSON.stringify({
        type: 'whiteboard_clear'
      }));
    }
    toast.info('Whiteboard cleared for everyone in room.');
  };

  // Export Canvas as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast.success('Whiteboard exported as PNG.');
    } catch (e) {
      toast.error('Failed to export whiteboard image.');
    }
  };

  // Shared Notes handling with debounced broadcast
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);

    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => {
      if (signalingWs && signalingWs.readyState === WebSocket.OPEN) {
        signalingWs.send(JSON.stringify({
          type: 'notes_update',
          notes: val
        }));
      }
    }, 350);
  };

  const handleCopyNotes = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setNotesCopied(true);
    toast.success('Notes copied to clipboard!');
    setTimeout(() => setNotesCopied(false), 2000);
  };

  const handleDownloadNotes = () => {
    if (!notes) return;
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Meeting notes downloaded as .txt');
  };

  // Listen for real-time incoming events from other peers on the signaling socket
  useEffect(() => {
    if (!signalingWs) return;

    const originalOnMessage = signalingWs.onmessage;
    const handleWhiteboardMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'whiteboard_draw' && data.stroke) {
          setStrokes(prev => [...prev, data.stroke]);
        } else if (data.type === 'whiteboard_clear') {
          setStrokes([]);
        } else if (data.type === 'notes_update' && data.notes !== undefined) {
          setNotes(data.notes);
        }
      } catch (e) {}

      if (originalOnMessage) {
        originalOnMessage(event);
      }
    };

    signalingWs.onmessage = handleWhiteboardMessage;

    return () => {
      if (signalingWs) {
        signalingWs.onmessage = originalOnMessage;
      }
    };
  }, [signalingWs]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#090d16',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
      position: 'relative'
    }}>
      {/* Top Header & Tab Navigation */}
      <div style={{
        padding: '0.65rem 1rem',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 5
      }}>
        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setActiveTab('canvas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: activeTab === 'canvas' ? '1px solid var(--primary)' : '1px solid transparent',
              backgroundColor: activeTab === 'canvas' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              color: activeTab === 'canvas' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <PenTool size={15} color={activeTab === 'canvas' ? 'var(--primary)' : 'currentColor'} />
            <span>Interactive Whiteboard</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: activeTab === 'notes' ? '1px solid var(--primary)' : '1px solid transparent',
              backgroundColor: activeTab === 'notes' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              color: activeTab === 'notes' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={15} color={activeTab === 'notes' ? 'var(--primary)' : 'currentColor'} />
            <span>Collaborative Notes</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activeTab === 'canvas' ? (
            <>
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: strokes.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
                  cursor: strokes.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem'
                }}
                title="Undo last stroke"
              >
                <RotateCcw size={13} />
                <span>Undo</span>
              </button>

              <button
                onClick={handleClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '6px',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="Clear whiteboard for everyone"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>

              <button
                onClick={handleExportPNG}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '6px',
                  color: 'var(--status-completed)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
                title="Download whiteboard drawing as PNG image"
              >
                <Download size={13} />
                <span>Save PNG</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopyNotes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                {notesCopied ? <Check size={13} color="var(--status-completed)" /> : <Copy size={13} />}
                <span>{notesCopied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadNotes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Download size={13} />
                <span>Export TXT</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
              title="Close Whiteboard"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'canvas' ? (
          <>
            {/* HTML5 Interactive Drawing Canvas */}
            <div style={{ width: '100%', height: '100%', position: 'relative', cursor: currentTool === 'eraser' ? 'crosshair' : 'default' }}>
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  touchAction: 'none'
                }}
              />

              {/* Floating Canvas Drawing Toolbar */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                padding: '0.4rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                zIndex: 10
              }}>
                {/* Tool Selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button
                    onClick={() => setCurrentTool('pen')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'pen' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Freehand Pen"
                  >
                    <PenTool size={16} />
                  </button>

                  <button
                    onClick={() => setCurrentTool('line')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'line' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Straight Line"
                  >
                    <Minus size={16} />
                  </button>

                  <button
                    onClick={() => setCurrentTool('arrow')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'arrow' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Arrow"
                  >
                    <MoveRight size={16} />
                  </button>

                  <button
                    onClick={() => setCurrentTool('rect')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'rect' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Rectangle"
                  >
                    <Square size={16} />
                  </button>

                  <button
                    onClick={() => setCurrentTool('circle')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'circle' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Circle"
                  >
                    <Circle size={16} />
                  </button>

                  <button
                    onClick={() => setCurrentTool('eraser')}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      backgroundColor: currentTool === 'eraser' ? 'var(--primary)' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Eraser"
                  >
                    <Eraser size={16} />
                  </button>
                </div>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

                {/* Color Palette (disabled when using eraser) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: currentTool === 'eraser' ? 0.35 : 1 }}>
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c.value}
                      onClick={() => {
                        if (currentTool === 'eraser') setCurrentTool('pen');
                        setCurrentColor(c.value);
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: currentColor === c.value && currentTool !== 'eraser' ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: currentColor === c.value ? `0 0 8px ${c.value}` : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={c.name}
                    />
                  ))}
                </div>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

                {/* Stroke Width Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {STROKE_WIDTHS.map(sw => (
                    <button
                      key={sw.value}
                      onClick={() => setStrokeWidth(sw.value)}
                      style={{
                        padding: '0.25rem 0.45rem',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        backgroundColor: strokeWidth === sw.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        color: strokeWidth === sw.value ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      title={`${sw.label} stroke`}
                    >
                      {sw.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Collaborative Shared Notes Editor */
          <div style={{
            width: '100%',
            height: '100%',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span>Live collaborative meeting notes (synchronized across all participants)</span>
              <span>{notes.length} characters</span>
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Start typing meeting agenda, key decisions, discussion notes, or action items here... Changes sync in real-time."
              style={{
                flex: 1,
                width: '100%',
                backgroundColor: '#070b14',
                color: '#e2e8f0',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
