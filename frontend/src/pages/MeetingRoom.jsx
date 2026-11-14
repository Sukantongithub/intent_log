import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getMeetingByCode, 
  endAndAnalyzeMeeting, 
  getMergedTranscript,
  transcribeSegment,
  updateTranscriptSegment,
  exportMeetingMoMPDF
} from '../services/api';
import { toast } from 'react-toastify';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  PhoneOff, 
  Users, 
  MessageSquare, 
  Copy, 
  Check, 
  ShieldCheck,
  Bot,
  Send,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  X,
  Languages,
  BookOpen,
  Edit2,
  Plus,
  Sparkles,
  FileDown,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  PenTool,
  LayoutGrid,
  Maximize2,
  Pin,
  Clock
} from 'lucide-react';
import WhiteboardCanvas from '../components/WhiteboardCanvas';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_NAMING_WORDS,
  getAllNamingWords,
  saveCustomNamingWord,
  removeCustomNamingWord,
  normalizeTranscriptNamingWords,
  buildJsgfGrammar
} from '../utils/speechVocabulary';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Real-Time WebRTC Connection Health & Network Quality Badge
const NetworkQualityBadge = ({ status = 'good', rtt = null, packetLoss = null }) => {
  let color = 'var(--status-completed)';
  let label = 'Good';
  let Icon = Wifi;

  if (status === 'reconnecting' || status === 'disconnected' || status === 'checking') {
    color = '#f59e0b';
    label = 'Reconnecting';
    Icon = RefreshCw;
  } else if (status === 'failed') {
    color = '#ef4444';
    label = 'Poor';
    Icon = WifiOff;
  } else if (status === 'fair') {
    color = '#f59e0b';
    label = 'Fair';
    Icon = Wifi;
  } else if (status === 'excellent') {
    color = '#10b981';
    label = 'Excellent';
    Icon = Wifi;
  }

  const tooltip = rtt !== null && rtt !== undefined
    ? `Network: ${label} • RTT: ${Math.round(rtt)}ms${packetLoss !== null ? ` • Loss: ${packetLoss}%` : ''}`
    : `Network: ${label}`;

  return (
    <div
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '9999px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        border: `1px solid ${color}55`,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: color,
        userSelect: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease'
      }}
    >
      <Icon size={11} className={status === 'reconnecting' || status === 'checking' ? 'spin-slow' : ''} />
      <span>{status === 'reconnecting' || status === 'checking' ? 'Reconnecting' : rtt !== null ? `${Math.round(rtt)}ms` : label}</span>
    </div>
  );
};

// Remote Participant Video & Audio Tile Component
const RemoteVideoTile = ({
  peer,
  cameraStream,
  audioStream,
  pc,
  isScreenSharing,
  networkStats,
  variant = 'grid', // 'grid' | 'spotlight' | 'filmstrip'
  onPin,
  isPinned,
  onClick
}) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let activeCamStream = cameraStream;
    if ((!activeCamStream || activeCamStream.getVideoTracks().length === 0) && pc) {
      const transceivers = pc.getTransceivers();
      const videoTransceivers = transceivers.filter(t => t.receiver?.track?.kind === 'video');
      const camTrack = videoTransceivers[0]?.receiver?.track;
      if (camTrack) {
        activeCamStream = new MediaStream([camTrack]);
      }
    }

    if (videoRef.current && activeCamStream) {
      videoRef.current.srcObject = activeCamStream;
      videoRef.current.play().catch(e => console.log("Remote camera play waiting:", e));
    }
  }, [cameraStream, pc, peer?.media_state?.camera, peer?._updated]);

  useEffect(() => {
    let activeAudStream = audioStream;
    if ((!activeAudStream || activeAudStream.getAudioTracks().length === 0) && pc) {
      const transceivers = pc.getTransceivers();
      const audTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'audio');
      const audTrack = audTransceiver?.receiver?.track;
      if (audTrack) {
        activeAudStream = new MediaStream([audTrack]);
      }
    }

    if (audioRef.current && activeAudStream) {
      audioRef.current.srcObject = activeAudStream;
      audioRef.current.play().catch(e => console.log("Remote audio play waiting:", e));
    }
  }, [audioStream, pc, peer?.media_state?.mic, peer?._updated]);

  const hasCamera = peer?.media_state?.camera;
  const isMicOn = peer?.media_state?.mic;
  const isReconnecting = networkStats?.status === 'reconnecting' || networkStats?.status === 'checking' || pc?.iceConnectionState === 'disconnected';

  const isFilmstrip = variant === 'filmstrip';
  const isSpotlight = variant === 'spotlight';

  return (
    <div
      onClick={onClick}
      className={isFilmstrip ? "filmstrip-card" : ""}
      style={{
        backgroundColor: '#141d2e',
        borderRadius: isFilmstrip ? '12px' : isSpotlight ? '16px' : '14px',
        position: 'relative',
        aspectRatio: '16/9',
        width: isFilmstrip ? '200px' : isSpotlight ? '100%' : 'auto',
        height: isFilmstrip ? '115px' : isSpotlight ? '100%' : 'auto',
        minHeight: isFilmstrip ? 'auto' : isSpotlight ? '360px' : (isScreenSharing ? '140px' : '200px'),
        maxHeight: isSpotlight ? 'calc(100vh - 270px)' : 'none',
        flexShrink: isFilmstrip ? 0 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: peer.isSpeaking
          ? '3px solid #10b981'
          : isPinned
            ? '2px solid var(--primary)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: peer.isSpeaking
          ? '0 0 24px rgba(16, 185, 129, 0.45)'
          : isSpotlight
            ? '0 12px 36px rgba(0, 0, 0, 0.5)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.22s ease'
      }}
    >
      {/* Remote Video Stream (muted so audio plays through dedicated audio element without echo) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: isSpotlight ? 'contain' : 'cover',
          display: hasCamera ? 'block' : 'none',
          backgroundColor: '#000000'
        }}
      />
      {/* Dedicated Remote Audio Stream */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Reconnecting Stream Overlay */}
      {isReconnecting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          zIndex: 4
        }}>
          <RefreshCw size={22} color="#f59e0b" className="spin-slow" />
          <span style={{ fontSize: '0.75rem', color: '#fcd34d', fontWeight: 600 }}>
            Reconnecting stream...
          </span>
        </div>
      )}

      {/* Network Quality Badge (Top-Left) */}
      {!isFilmstrip && (
        <div style={{ position: 'absolute', top: '0.65rem', left: '0.65rem', zIndex: 3 }}>
          <NetworkQualityBadge
            status={networkStats?.status || (pc?.iceConnectionState === 'connected' ? 'good' : 'checking')}
            rtt={networkStats?.rtt}
            packetLoss={networkStats?.packetLoss}
          />
        </div>
      )}

      {/* Spotlight / Pin Badge (Top-Right) */}
      {isSpotlight ? (
        <div style={{
          position: 'absolute',
          top: '0.65rem',
          right: '0.65rem',
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: '#ffffff',
          zIndex: 3,
          backdropFilter: 'blur(4px)'
        }}>
          <Maximize2 size={12} />
          <span>Spotlight Stage</span>
        </div>
      ) : onPin && !isFilmstrip && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPin(peer.peer_id); }}
          style={{
            position: 'absolute',
            top: '0.65rem',
            right: peer?.media_state?.screen ? '7.5rem' : '0.65rem',
            backgroundColor: isPinned ? 'var(--primary)' : 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.25rem 0.45rem',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backdropFilter: 'blur(6px)',
            zIndex: 3,
            transition: 'all 0.2s ease'
          }}
          title={isPinned ? "Unpin participant" : "Pin to spotlight"}
        >
          <Pin size={11} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
          <span>{isPinned ? 'Pinned' : 'Pin'}</span>
        </button>
      )}

      {/* Avatar Fallback Tile when Camera is Off */}
      {!hasCamera && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: isFilmstrip ? '38px' : isSpotlight ? '84px' : '64px',
            height: isFilmstrip ? '38px' : isSpotlight ? '84px' : '64px',
            borderRadius: '50%',
            backgroundColor: peer.isSpeaking ? '#10b981' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isFilmstrip ? '1rem' : isSpotlight ? '2rem' : '1.5rem',
            fontWeight: 700,
            margin: '0 auto 0.4rem',
            color: '#ffffff',
            boxShadow: peer.isSpeaking ? '0 0 20px rgba(16, 185, 129, 0.6)' : 'none'
          }}>
            {peer.name?.charAt(0) || 'P'}
          </div>
          <div style={{ fontSize: isFilmstrip ? '0.72rem' : '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
            {peer.name}
          </div>
        </div>
      )}

      {/* Sharing Screen Badge */}
      {peer?.media_state?.screen && (
        <div style={{
          position: 'absolute',
          top: '0.65rem',
          right: isSpotlight ? '8rem' : '0.65rem',
          backgroundColor: 'rgba(99, 102, 241, 0.9)',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: '#ffffff',
          zIndex: 2,
          backdropFilter: 'blur(4px)'
        }}>
          <Monitor size={12} />
          <span>Sharing Screen</span>
        </div>
      )}

      {/* Tile Bottom Info Tag */}
      <div style={{
        position: 'absolute',
        bottom: isFilmstrip ? '0.35rem' : '0.65rem',
        left: isFilmstrip ? '0.35rem' : '0.65rem',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: isFilmstrip ? '0.15rem 0.45rem' : '0.25rem 0.65rem',
        borderRadius: '6px',
        fontSize: isFilmstrip ? '0.68rem' : '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        backdropFilter: 'blur(4px)',
        zIndex: 2,
        maxWidth: '90%'
      }}>
        {isMicOn ? (
          <Volume2 size={isFilmstrip ? 10 : 12} color="#10b981" />
        ) : (
          <VolumeX size={isFilmstrip ? 10 : 12} color="#ef4444" />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {peer.name} {peer.is_host ? '• Host' : ''}
        </span>
        {peer.isSpeaking && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '12px', marginLeft: '2px' }}>
            <span className="speaking-eq-bar bar-1" />
            <span className="speaking-eq-bar bar-2" />
            <span className="speaking-eq-bar bar-3" />
          </span>
        )}
      </div>
    </div>
  );
};

// Local Participant Video Tile Component
const LocalVideoTile = ({
  localVideoRef,
  cameraEnabled,
  micEnabled,
  isSpeaking,
  localDisplayName,
  isLocalHost,
  signalingStatus,
  wsLatency,
  variant = 'grid', // 'grid' | 'spotlight' | 'filmstrip'
  onPin,
  isPinned,
  onClick
}) => {
  const isFilmstrip = variant === 'filmstrip';
  const isSpotlight = variant === 'spotlight';

  return (
    <div
      onClick={onClick}
      className={isFilmstrip ? "filmstrip-card" : ""}
      style={{
        backgroundColor: '#141d2e',
        borderRadius: isFilmstrip ? '12px' : isSpotlight ? '16px' : '14px',
        position: 'relative',
        aspectRatio: '16/9',
        width: isFilmstrip ? '200px' : isSpotlight ? '100%' : 'auto',
        height: isFilmstrip ? '115px' : isSpotlight ? '100%' : 'auto',
        minHeight: isFilmstrip ? 'auto' : isSpotlight ? '360px' : '200px',
        maxHeight: isSpotlight ? 'calc(100vh - 270px)' : 'none',
        flexShrink: isFilmstrip ? 0 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: isSpeaking
          ? '3px solid #10b981'
          : isPinned
            ? '2px solid var(--primary)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isSpeaking
          ? '0 0 24px rgba(16, 185, 129, 0.45)'
          : isSpotlight
            ? '0 12px 36px rgba(0, 0, 0, 0.5)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.22s ease'
      }}
    >
      {cameraEnabled ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: isSpotlight ? 'contain' : 'cover',
            transform: 'scaleX(-1)', // Mirror local view
            backgroundColor: '#000000'
          }}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: isFilmstrip ? '38px' : isSpotlight ? '84px' : '64px',
            height: isFilmstrip ? '38px' : isSpotlight ? '84px' : '64px',
            borderRadius: '50%',
            backgroundColor: isSpeaking ? '#10b981' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isFilmstrip ? '1rem' : isSpotlight ? '2rem' : '1.5rem',
            fontWeight: 700,
            margin: '0 auto 0.4rem',
            color: '#ffffff',
            boxShadow: isSpeaking ? '0 0 20px rgba(16, 185, 129, 0.6)' : 'none'
          }}>
            {localDisplayName.charAt(0)}
          </div>
          <div style={{ fontSize: isFilmstrip ? '0.72rem' : '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
            {localDisplayName} (You)
          </div>
        </div>
      )}

      {/* Network Quality Badge (top-left) */}
      {!isFilmstrip && (
        <div style={{ position: 'absolute', top: '0.65rem', left: '0.65rem', zIndex: 3 }}>
          <NetworkQualityBadge
            status={signalingStatus}
            rtt={wsLatency}
          />
        </div>
      )}

      {/* Spotlight / Pin Badge (top-right) */}
      {isSpotlight ? (
        <div style={{
          position: 'absolute',
          top: '0.65rem',
          right: '0.65rem',
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: '#ffffff',
          zIndex: 3,
          backdropFilter: 'blur(4px)'
        }}>
          <Maximize2 size={12} />
          <span>Spotlight Stage</span>
        </div>
      ) : onPin && !isFilmstrip && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPin('local'); }}
          style={{
            position: 'absolute',
            top: '0.65rem',
            right: '0.65rem',
            backgroundColor: isPinned ? 'var(--primary)' : 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.25rem 0.45rem',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backdropFilter: 'blur(6px)',
            zIndex: 3
          }}
          title={isPinned ? "Unpin participant" : "Pin to spotlight"}
        >
          <Pin size={11} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
          <span>{isPinned ? 'Pinned' : 'Pin'}</span>
        </button>
      )}

      {/* Tile Bottom Info Tag */}
      <div style={{
        position: 'absolute',
        bottom: isFilmstrip ? '0.35rem' : '0.65rem',
        left: isFilmstrip ? '0.35rem' : '0.65rem',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: isFilmstrip ? '0.15rem 0.45rem' : '0.25rem 0.65rem',
        borderRadius: '6px',
        fontSize: isFilmstrip ? '0.68rem' : '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        backdropFilter: 'blur(4px)',
        zIndex: 2,
        maxWidth: '90%'
      }}>
        {micEnabled ? <Volume2 size={isFilmstrip ? 10 : 12} color="#10b981" /> : <VolumeX size={isFilmstrip ? 10 : 12} color="#ef4444" />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {localDisplayName} (You) {isLocalHost ? '• Host' : ''}
        </span>
        {isSpeaking && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '12px', marginLeft: '2px' }}>
            <span className="speaking-eq-bar bar-1" />
            <span className="speaking-eq-bar bar-2" />
            <span className="speaking-eq-bar bar-3" />
          </span>
        )}
      </div>
    </div>
  );
};

// Dedicated Remote Screen Share Viewport Component
const RemoteScreenViewport = ({ peer, stream, pc }) => {
  const vidRef = useRef(null);

  useEffect(() => {
    let activeStream = stream;
    if ((!activeStream || activeStream.getVideoTracks().length === 0) && pc) {
      const receivers = pc.getReceivers();
      const videoReceivers = receivers.filter(r => r.track && r.track.kind === 'video');
      const tracks = videoReceivers.map(r => r.track).filter(t => t);
      const scrTrack = tracks.find(t => t.contentHint === 'detail') || tracks[1] || tracks[0];
      if (scrTrack) {
        activeStream = new MediaStream([scrTrack]);
      }
    }

    if (vidRef.current && activeStream) {
      if (vidRef.current.srcObject !== activeStream) {
        vidRef.current.srcObject = activeStream;
      }
      vidRef.current.play().catch(e => console.log("Remote screen play waiting:", e));
    }
  }, [stream, pc, peer?._updated, peer?.media_state?.screen]);

  return (
    <div style={{
      width: '100%',
      height: '60vh',
      minHeight: '380px',
      maxHeight: '680px',
      backgroundColor: '#070b14',
      borderRadius: '14px',
      overflow: 'hidden',
      position: 'relative',
      border: '2px solid var(--primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
    }}>
      <video
        ref={vidRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => vidRef.current?.play().catch(() => {})}
        onCanPlay={() => vidRef.current?.play().catch(() => {})}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: '0.4rem 0.75rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backdropFilter: 'blur(4px)',
        zIndex: 5
      }}>
        <Monitor size={14} color="var(--primary)" />
        <span>{peer.name} is sharing their screen</span>
      </div>
    </div>
  );
};

const MeetingRoom = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const localPeerIdRef = useRef('peer_' + Math.random().toString(36).substr(2, 9));
  const [isLocalHost, setIsLocalHost] = useState(false);
  const [assignedLocalName, setAssignedLocalName] = useState(null);
  const [remotePeers, setRemotePeers] = useState({}); // peer_id -> peer_data
  const remotePeersRef = useRef({});

  // Media States
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaBlockedNotice, setMediaBlockedNotice] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const [interimText, setInterimText] = useState('');

  // UI States
  const [copied, setCopied] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(true);
  const [transcripts, setTranscripts] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardHistory, setWhiteboardHistory] = useState([]);
  const [meetingNotes, setMeetingNotes] = useState('');

  // Layout & Spotlight States
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'spotlight'
  const [pinnedPeerId, setPinnedPeerId] = useState(null); // null | 'local' | peer_id
  const sessionStartTimeRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Re-attach camera feed whenever layout changes or video element re-mounts
  useEffect(() => {
    if (cameraEnabled && cameraStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== cameraStreamRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [cameraEnabled, layoutMode, pinnedPeerId]);

  // Manual & Preset Spoken Segment Input
  const [manualText, setManualText] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('Host');

  // Speech Recognition Language & Naming Words Vocabulary State
  const [sttLanguage, setSttLanguage] = useState(() => {
    return localStorage.getItem('meeting_stt_language') || 'en-IN';
  });
  const sttLanguageRef = useRef(sttLanguage);
  useEffect(() => {
    sttLanguageRef.current = sttLanguage;
  }, [sttLanguage]);

  const [showVocabManager, setShowVocabManager] = useState(false);
  const [newVocabWord, setNewVocabWord] = useState('');
  const [namingWordsList, setNamingWordsList] = useState([]);
  const [editingTranscriptId, setEditingTranscriptId] = useState(null);
  const [editingTranscriptText, setEditingTranscriptText] = useState('');

  // Media & WebRTC Refs
  const audioStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  const peerConnectionsRef = useRef({}); // peer_id -> RTCRtpConnection
  const camSendersRef = useRef({}); // peer_id -> RTCRtpSender (camera)
  const screenSendersRef = useRef({}); // peer_id -> RTCRtpSender (screen)
  const remoteCameraStreamsRef = useRef({}); // peer_id -> MediaStream (camera)
  const remoteAudioStreamsRef = useRef({}); // peer_id -> MediaStream (audio)
  const remoteScreenStreamsRef = useRef({}); // peer_id -> MediaStream (screen)
  const signalingWsRef = useRef(null);

  // WebRTC Resiliency & Connection Quality States
  const [peerNetworkStats, setPeerNetworkStats] = useState({}); // peer_id -> { status, rtt, packetLoss, iceState }
  const [signalingStatus, setSignalingStatus] = useState('connected'); // 'connected' | 'reconnecting'
  const [wsLatency, setWsLatency] = useState(null);

  const iceQueuesRef = useRef({}); // peer_id -> RTCIceCandidate[]
  const reconnectTimeoutsRef = useRef({}); // peer_id -> timeoutId
  const wsReconnectTimeoutRef = useRef(null);
  const wsHeartbeatIntervalRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const wsReconnectAttemptRef = useRef(0);
  const isUnmountingRef = useRef(false);

  // Display Name Determination (distinguishes Host from Guest clearly)
  const localDisplayName = assignedLocalName || (
    isLocalHost 
      ? (user?.name && user.name !== 'Application Super Admin' ? user.name : 'Host')
      : (user?.name && user.name !== 'Application Super Admin' ? user.name : 'Guest')
  );

  const remoteScreenPeer = Object.values(remotePeers).find(p => p.media_state?.screen);
  const isAnyScreenSharing = isScreenSharing || !!remoteScreenPeer;
  const isStageExpanded = isAnyScreenSharing || showWhiteboard;

  // Audio Context & Speech Recognition Refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const meetingStartTimeRef = useRef(Date.now());
  const micEnabledRef = useRef(false);
  const speechActiveRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef(null);
  const recognitionWatchdogRef = useRef(null);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  const updateActiveNamingWords = () => {
    const peerNames = Object.values(remotePeers).map(p => p.name).filter(Boolean);
    const active = getAllNamingWords([localDisplayName, ...peerNames]);
    setNamingWordsList(active);
  };

  useEffect(() => {
    updateActiveNamingWords();
  }, [localDisplayName, remotePeers]);

  // Drain queued remote ICE candidates after remoteDescription is set
  const drainIceQueue = async (peerId, pc) => {
    const queue = iceQueuesRef.current[peerId] || [];
    iceQueuesRef.current[peerId] = [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn(`Error applying queued ICE candidate for ${peerId}:`, e);
      }
    }
  };

  // Helper to extract dedicated transceivers from peer connection
  const getPeerTransceivers = (pc) => {
    const transceivers = pc.getTransceivers();
    const videoTransceivers = transceivers.filter(t => t.receiver?.track?.kind === 'video');
    const camTransceiver = videoTransceivers[0] || null;
    const scrTransceiver = videoTransceivers.length > 1 ? videoTransceivers[1] : null;
    const audTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'audio') || null;
    return { camTransceiver, scrTransceiver, audTransceiver };
  };

  // WebRTC Peer Connection Factory & Resilient Lifecycle Management
  const createPeerConnection = (targetPeerId, ws) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionsRef.current[targetPeerId] = pc;

    // 1. Audio (dedicated)
    if (audioStreamRef.current && audioStreamRef.current.getAudioTracks().length > 0) {
      pc.addTrack(audioStreamRef.current.getAudioTracks()[0], audioStreamRef.current);
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // 2. Camera Video (dedicated)
    if (cameraStreamRef.current && cameraStreamRef.current.getVideoTracks().length > 0) {
      const camTrack = cameraStreamRef.current.getVideoTracks()[0];
      const camSender = pc.addTrack(camTrack, cameraStreamRef.current);
      camSendersRef.current[targetPeerId] = camSender;
    } else {
      const camTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
      camSendersRef.current[targetPeerId] = camTransceiver.sender;
    }

    // 3. Screen Share Video (if currently active)
    if (isScreenSharing && screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
      const scrTrack = screenStreamRef.current.getVideoTracks()[0];
      const scrSender = pc.addTrack(scrTrack, screenStreamRef.current);
      screenSendersRef.current[targetPeerId] = scrSender;
    }

    // Listen to remote tracks
    pc.ontrack = (event) => {
      const track = event.track;
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([track]);
      const peerState = remotePeersRef.current[targetPeerId]?.media_state || {};

      if (track.kind === 'audio') {
        remoteAudioStreamsRef.current[targetPeerId] = stream;
      } else if (track.kind === 'video') {
        const isScreen = (peerState.screen_stream_id && stream.id === peerState.screen_stream_id)
          || track.contentHint === 'detail'
          || (peerState.screen && !peerState.camera)
          || (peerState.screen && remoteCameraStreamsRef.current[targetPeerId] && remoteCameraStreamsRef.current[targetPeerId].id !== stream.id);

        if (isScreen) {
          remoteScreenStreamsRef.current[targetPeerId] = stream;
        } else {
          remoteCameraStreamsRef.current[targetPeerId] = stream;
        }
      }

      track.onunmute = () => {
        syncRemoteStreams(targetPeerId, pc);
      };

      setRemotePeers(prev => ({
        ...prev,
        [targetPeerId]: {
          ...(prev[targetPeerId] || {}),
          _updated: Date.now()
        }
      }));
    };

    // Forward ICE candidates to remote peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const currentWs = signalingWsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({
            type: 'ice_candidate',
            target_peer_id: targetPeerId,
            candidate: event.candidate
          }));
        }
      }
    };

    // Resilient ICE Connection State Monitoring & Auto-Restart
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      setPeerNetworkStats(prev => ({
        ...prev,
        [targetPeerId]: {
          ...(prev[targetPeerId] || {}),
          iceState,
          status: (iceState === 'connected' || iceState === 'completed')
            ? (prev[targetPeerId]?.status || 'good')
            : (iceState === 'disconnected' || iceState === 'checking' ? 'reconnecting' : 'failed')
        }
      }));

      if (iceState === 'disconnected' || iceState === 'failed') {
        if (reconnectTimeoutsRef.current[targetPeerId]) {
          clearTimeout(reconnectTimeoutsRef.current[targetPeerId]);
        }
        reconnectTimeoutsRef.current[targetPeerId] = setTimeout(async () => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.warn(`[WebRTC] Initiating ICE restart to recover connection with peer ${targetPeerId}`);
            try {
              if (pc.restartIce) {
                pc.restartIce();
              }
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              const currentWs = signalingWsRef.current;
              if (currentWs && currentWs.readyState === WebSocket.OPEN) {
                currentWs.send(JSON.stringify({
                  type: 'offer',
                  target_peer_id: targetPeerId,
                  offer
                }));
              }
            } catch (e) {
              console.warn(`[WebRTC] ICE restart failed for peer ${targetPeerId}:`, e);
            }
          }
        }, 1500);
      }
    };

    // Connection state monitor
    pc.onconnectionstatechange = () => {
      const connState = pc.connectionState;
      if (connState === 'connected') {
        if (reconnectTimeoutsRef.current[targetPeerId]) {
          clearTimeout(reconnectTimeoutsRef.current[targetPeerId]);
          delete reconnectTimeoutsRef.current[targetPeerId];
        }
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const currentWs = signalingWsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({
            type: 'offer',
            target_peer_id: targetPeerId,
            offer
          }));
        }
      } catch (err) {
        console.error("Renegotiation error:", err);
      }
    };

    return pc;
  };

  const initiatePeerConnection = async (targetPeerId, ws) => {
    try {
      const pc = createPeerConnection(targetPeerId, ws);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'offer',
          target_peer_id: targetPeerId,
          offer
        }));
      }
    } catch (err) {
      console.error("Error initiating peer connection:", err);
    }
  };

  const syncRemoteStreams = (peerId, pc) => {
    if (!pc) return;
    try {
      const peerState = remotePeersRef.current[peerId]?.media_state || {};
      const receivers = pc.getReceivers();
      const videoReceivers = receivers.filter(r => r.track && r.track.kind === 'video');
      const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');

      // Audio Stream
      if (audioReceiver?.track) {
        let aStream = remoteAudioStreamsRef.current[peerId];
        if (!aStream || !aStream.getTracks().includes(audioReceiver.track)) {
          remoteAudioStreamsRef.current[peerId] = new MediaStream([audioReceiver.track]);
        }
      }

      const liveVideoTracks = videoReceivers.map(r => r.track).filter(t => t);

      // Handle Screen Share stream
      if (peerState.screen) {
        let sTrack = null;
        if (peerState.screen_stream_id) {
          const scrReceiver = videoReceivers.find(r => r.track && r.track.contentHint === 'detail');
          sTrack = scrReceiver?.track;
        }
        if (!sTrack) {
          sTrack = liveVideoTracks.find(t => t.contentHint === 'detail') 
            || (liveVideoTracks.length > 1 ? liveVideoTracks[1] : liveVideoTracks[0]);
        }
        if (sTrack) {
          remoteScreenStreamsRef.current[peerId] = new MediaStream([sTrack]);
        }
      } else {
        remoteScreenStreamsRef.current[peerId] = null;
      }

      // Handle Camera stream
      if (peerState.camera) {
        const currentScreenTrack = remoteScreenStreamsRef.current[peerId]?.getVideoTracks()[0];
        const camTrack = liveVideoTracks.find(t => t !== currentScreenTrack) || liveVideoTracks[0];
        if (camTrack && camTrack !== currentScreenTrack) {
          remoteCameraStreamsRef.current[peerId] = new MediaStream([camTrack]);
        } else if (camTrack && !peerState.screen) {
          remoteCameraStreamsRef.current[peerId] = new MediaStream([camTrack]);
        }
      } else {
        remoteCameraStreamsRef.current[peerId] = null;
      }

      setRemotePeers(prev => ({
        ...prev,
        [peerId]: {
          ...(prev[peerId] || {}),
          _updated: Date.now()
        }
      }));
    } catch (err) {
      console.error("Error in syncRemoteStreams:", err);
    }
  };

  const renegotiatePeers = async () => {
    const ws = signalingWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    for (const [targetPeerId, pc] of Object.entries(peerConnectionsRef.current)) {
      try {
        if (pc.signalingState !== 'stable') continue;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          type: 'offer',
          target_peer_id: targetPeerId,
          offer
        }));
      } catch (err) {
        console.error(`Renegotiation error with peer ${targetPeerId}:`, err);
      }
    }
  };

  const handleReceiveOffer = async (senderPeerId, offer, ws) => {
    try {
      let pc = peerConnectionsRef.current[senderPeerId];
      if (!pc) {
        pc = createPeerConnection(senderPeerId, ws);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Flush any ICE candidates that arrived before the offer/remoteDescription
      await drainIceQueue(senderPeerId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'answer',
          target_peer_id: senderPeerId,
          answer
        }));
      }

      syncRemoteStreams(senderPeerId, pc);
    } catch (err) {
      console.error("Error receiving offer:", err);
    }
  };

  const handleReceiveAnswer = async (senderPeerId, answer) => {
    try {
      const pc = peerConnectionsRef.current[senderPeerId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Flush any ICE candidates that arrived before the answer/remoteDescription
        await drainIceQueue(senderPeerId, pc);
        syncRemoteStreams(senderPeerId, pc);
      }
    } catch (err) {
      console.error("Error receiving answer:", err);
    }
  };

  const handleReceiveIceCandidate = async (senderPeerId, candidate) => {
    try {
      const pc = peerConnectionsRef.current[senderPeerId];
      // If remote description is not set yet, queue the ICE candidate to prevent DOMException
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        if (!iceQueuesRef.current[senderPeerId]) {
          iceQueuesRef.current[senderPeerId] = [];
        }
        iceQueuesRef.current[senderPeerId].push(candidate);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error receiving ICE candidate:", err);
    }
  };

  // 1. Connect to WebRTC Signaling Server with Heartbeat & Auto-Reconnect
  const connectSignaling = () => {
    if (!code || isUnmountingRef.current) return;

    if (signalingWsRef.current && (signalingWsRef.current.readyState === WebSocket.OPEN || signalingWsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/meeting/${code}`;
    const ws = new WebSocket(wsUrl);
    signalingWsRef.current = ws;

    ws.onopen = () => {
      wsReconnectAttemptRef.current = 0;
      setSignalingStatus('connected');
      ws.send(JSON.stringify({
        peer_id: localPeerIdRef.current,
        name: user?.name || 'Participant',
        media_state: {
          mic: micEnabledRef.current,
          camera: cameraEnabled,
          screen: isScreenSharing
        }
      }));

      // Keepalive heartbeat ping every 5 seconds
      if (wsHeartbeatIntervalRef.current) clearInterval(wsHeartbeatIntervalRef.current);
      wsHeartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        }
      }, 5000);
    };

    ws.onclose = () => {
      if (wsHeartbeatIntervalRef.current) clearInterval(wsHeartbeatIntervalRef.current);
      if (isUnmountingRef.current) return;

      console.warn("Signaling WebSocket closed. Initiating auto-reconnect...");
      setSignalingStatus('reconnecting');

      const attempt = wsReconnectAttemptRef.current;
      const delay = Math.min(1000 * Math.pow(1.5, attempt), 8000);
      wsReconnectAttemptRef.current += 1;

      if (wsReconnectTimeoutRef.current) clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountingRef.current) {
          connectSignaling();
        }
      }, delay);
    };

    ws.onerror = (err) => {
      console.warn("Signaling WebSocket error:", err);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'pong' && data.timestamp) {
          const rtt = Date.now() - data.timestamp;
          setWsLatency(rtt);
        } else if (data.type === 'room_state') {
          setIsLocalHost(data.is_host);
          if (data.assigned_name) {
            setAssignedLocalName(data.assigned_name);
          }
          if (data.whiteboard_history) {
            setWhiteboardHistory(data.whiteboard_history);
          }
          if (data.meeting_notes) {
            setMeetingNotes(data.meeting_notes);
          }
          const newPeers = {};
          for (const p of data.existing_peers) {
            newPeers[p.peer_id] = {
              peer_id: p.peer_id,
              name: p.name,
              is_host: p.is_host,
              media_state: p.media_state || { mic: false, camera: false, screen: false },
              isSpeaking: false
            };
            initiatePeerConnection(p.peer_id, ws);
          }
          remotePeersRef.current = newPeers;
          setRemotePeers(newPeers);

        } else if (data.type === 'peer_joined') {
          toast.info(`${data.name} joined the meeting.`);
          const updated = {
            ...remotePeersRef.current,
            [data.peer_id]: {
              peer_id: data.peer_id,
              name: data.name,
              is_host: data.is_host,
              media_state: data.media_state || { mic: false, camera: false, screen: false },
              isSpeaking: false
            }
          };
          remotePeersRef.current = updated;
          setRemotePeers(updated);

        } else if (data.type === 'offer') {
          await handleReceiveOffer(data.sender_peer_id, data.offer, ws);

        } else if (data.type === 'answer') {
          await handleReceiveAnswer(data.sender_peer_id, data.answer);

        } else if (data.type === 'ice_candidate') {
          await handleReceiveIceCandidate(data.sender_peer_id, data.candidate);

        } else if (data.type === 'peer_media_updated') {
          const currentPeer = remotePeersRef.current[data.peer_id];
          if (currentPeer) {
            const updated = {
              ...remotePeersRef.current,
              [data.peer_id]: {
                ...currentPeer,
                media_state: {
                  ...currentPeer.media_state,
                  ...data.media_state
                },
                _updated: Date.now()
              }
            };
            remotePeersRef.current = updated;
            setRemotePeers(updated);
          }
          if (peerConnectionsRef.current[data.peer_id]) {
            syncRemoteStreams(data.peer_id, peerConnectionsRef.current[data.peer_id]);
          }

        } else if (data.type === 'peer_left') {
          toast.info(`${data.name || 'A participant'} left.`);
          if (peerConnectionsRef.current[data.peer_id]) {
            peerConnectionsRef.current[data.peer_id].close();
            delete peerConnectionsRef.current[data.peer_id];
          }
          if (reconnectTimeoutsRef.current[data.peer_id]) {
            clearTimeout(reconnectTimeoutsRef.current[data.peer_id]);
            delete reconnectTimeoutsRef.current[data.peer_id];
          }
          delete iceQueuesRef.current[data.peer_id];
          delete remoteCameraStreamsRef.current[data.peer_id];
          delete remoteAudioStreamsRef.current[data.peer_id];
          delete remoteScreenStreamsRef.current[data.peer_id];
          delete remotePeersRef.current[data.peer_id];
          setRemotePeers({ ...remotePeersRef.current });
          setPeerNetworkStats(prev => {
            const next = { ...prev };
            delete next[data.peer_id];
            return next;
          });

        } else if (data.type === 'chat_message') {
          try {
            const parsed = JSON.parse(data.message);
            if (parsed && parsed.type === 'transcript_edit') {
              setTranscripts(prev => prev.map((t, idx) => {
                if (idx === parsed.index || (parsed.transcript_id && (t.transcript_id === parsed.transcript_id || t.id === parsed.transcript_id || t._id === parsed.transcript_id))) {
                  return { ...t, text: parsed.text };
                }
                return t;
              }));
            } else if (parsed && parsed.text) {
              setTranscripts(prev => {
                if (prev.some(t => t.text === parsed.text && Math.abs(t.start_time - parsed.start_time) < 2)) {
                  return prev;
                }
                return [...prev, parsed];
              });
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error("Signaling message handling error:", err);
      }
    };
  };

  useEffect(() => {
    isUnmountingRef.current = false;
    connectSignaling();

    return () => {
      isUnmountingRef.current = true;
      if (wsHeartbeatIntervalRef.current) clearInterval(wsHeartbeatIntervalRef.current);
      if (wsReconnectTimeoutRef.current) clearTimeout(wsReconnectTimeoutRef.current);
      if (signalingWsRef.current && signalingWsRef.current.readyState === WebSocket.OPEN) {
        signalingWsRef.current.close(1000, "Component unmounted");
      }
    };
  }, [code]);

  // Periodic WebRTC Stats Polling (RTT Latency, Packet Loss, Connection Status)
  useEffect(() => {
    statsIntervalRef.current = setInterval(async () => {
      for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
        if (!pc || pc.signalingState === 'closed') continue;
        try {
          const stats = await pc.getStats();
          let currentRtt = null;
          let packetLossPct = null;

          stats.forEach(report => {
            if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
              if (report.currentRoundTripTime !== undefined) {
                currentRtt = report.currentRoundTripTime * 1000;
              }
            }
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
              const lost = report.packetsLost || 0;
              const received = report.packetsReceived || 0;
              const total = lost + received;
              if (total > 0) {
                packetLossPct = Math.round((lost / total) * 100);
              }
            }
          });

          const iceState = pc.iceConnectionState;
          let status = 'good';
          if (iceState === 'disconnected' || iceState === 'checking') {
            status = 'reconnecting';
          } else if (iceState === 'failed') {
            status = 'failed';
          } else if (currentRtt !== null) {
            if (currentRtt < 100 && (packetLossPct === null || packetLossPct < 2)) {
              status = 'excellent';
            } else if (currentRtt < 250 && (packetLossPct === null || packetLossPct < 5)) {
              status = 'good';
            } else {
              status = 'fair';
            }
          }

          setPeerNetworkStats(prev => ({
            ...prev,
            [peerId]: {
              rtt: currentRtt !== null ? currentRtt : prev[peerId]?.rtt,
              packetLoss: packetLossPct !== null ? packetLossPct : prev[peerId]?.packetLoss,
              status,
              iceState
            }
          }));
        } catch (e) {}
      }
    }, 3000);

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, []);

  // 1-Click Stream & Connection Synchronization Action
  const handleResyncMedia = async () => {
    toast.info('Re-synchronizing media & WebRTC connection...');
    try {
      await renegotiatePeers();
      for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
        syncRemoteStreams(peerId, pc);
      }
      toast.success('Connection synchronized.');
    } catch (e) {
      toast.warn('Re-sync attempted.');
    }
  };

  useEffect(() => {
    fetchMeetingData();
    initAudioCaptureAndVAD();

    const interval = setInterval(() => {
      if (code) fetchTranscripts();
    }, 2500);

    // Watchdog: ensures transcription is never left stopped while mic is active
    recognitionWatchdogRef.current = setInterval(() => {
      if (micEnabledRef.current && !speechActiveRef.current) {
        startSpeechRecognitionSafe();
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (recognitionWatchdogRef.current) clearInterval(recognitionWatchdogRef.current);
      if (recognitionRestartTimeoutRef.current) clearTimeout(recognitionRestartTimeoutRef.current);
      cleanupStreams();
    };
  }, [code]);

  // Attach video stream refs when states change
  useEffect(() => {
    if (cameraEnabled && cameraStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraEnabled]);

  useEffect(() => {
    if (isScreenSharing && screenStreamRef.current && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  const cleanupStreams = () => {
    isUnmountingRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    stopSpeechRecognitionSafe();
    if (wsHeartbeatIntervalRef.current) clearInterval(wsHeartbeatIntervalRef.current);
    if (wsReconnectTimeoutRef.current) clearTimeout(wsReconnectTimeoutRef.current);
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    Object.values(reconnectTimeoutsRef.current).forEach(t => clearTimeout(t));
    reconnectTimeoutsRef.current = {};
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (signalingWsRef.current) {
      try {
        if (signalingWsRef.current.readyState === WebSocket.OPEN) {
          signalingWsRef.current.close(1000, "Leaving room");
        } else if (signalingWsRef.current.readyState === WebSocket.CONNECTING) {
          signalingWsRef.current.onopen = () => {
            try { signalingWsRef.current?.close(1000, "Leaving room"); } catch (e) {}
          };
        }
      } catch (e) {}
    }
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
    peerConnectionsRef.current = {};
    remoteCameraStreamsRef.current = {};
    remoteAudioStreamsRef.current = {};
    remoteScreenStreamsRef.current = {};
  };

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const data = await getMeetingByCode(code);
      setMeeting(data);
      fetchTranscripts(data.id || code);
    } catch (err) {
      toast.info(`Joined room with code: ${code}`);
      setMeeting({
        meeting_code: code,
        title: `Meeting Hall (${code})`,
        share_url: window.location.href
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscripts = async (targetId = null) => {
    const mId = targetId || meeting?.id || meeting?.meeting_code || code;
    if (!mId) return;
    try {
      const data = await getMergedTranscript(mId);
      if (data && data.merged_transcript) {
        setTranscripts(data.merged_transcript);
      }
    } catch (e) {
      // Ignore transcript polling errors
    }
  };

  const initAudioCaptureAndVAD = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicEnabled(false);
      setMediaBlockedNotice('Microphone and camera access requires a secure connection (use https:// or http://localhost:5173, not a LAN IP).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 48000 }
        }
      });
      audioStreamRef.current = stream;
      setMicEnabled(true);
      micEnabledRef.current = true;
      setMediaBlockedNotice(null);

      // Hardware Stream Recovery: Listen for microphone device disconnection
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          toast.warn('Microphone disconnected or turned off by system.');
          setMicEnabled(false);
          micEnabledRef.current = false;
          audioStreamRef.current = null;
          if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
            signalingWsRef.current.send(JSON.stringify({
              type: 'media_state',
              media_state: { mic: false }
            }));
          }
        };
      }

      // 1. Initialize Real Voice Activity Detection (VAD) via Web Audio API
      initAudioAnalyzer(stream);

      // 2. Initialize Real Web Speech API Recognition
      initSpeechRecognition();

    } catch (err) {
      setMicEnabled(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaBlockedNotice('Microphone/Camera permission is blocked in your browser. Click the lock/tune icon 🔒 in the URL address bar ➔ Set Microphone & Camera to "Allow" ➔ Refresh or click Retry.');
        toast.warn('Microphone permission blocked. Click the lock icon in the URL bar to allow.');
      } else if (err.name === 'NotFoundError') {
        toast.warn('No microphone found on this device.');
      } else {
        toast.info('Microphone permission ungranted. Click the mic button below to grant access.');
      }
    }
  };

  const initAudioAnalyzer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;

        // Active speech threshold
        const speaking = avg > 14;
        setIsSpeaking(speaking);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("Audio Context / VAD setup error:", err);
    }
  };

  const stopSpeechRecognitionSafe = () => {
    speechActiveRef.current = false;
    setSpeechActive(false);
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const startSpeechRecognitionSafe = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (!micEnabledRef.current) return;

    try {
      // Clean up any stale recognition session
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sttLanguageRef.current || 'en-IN';

      // Attach SpeechGrammarList for naming words biasing if supported
      try {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        if (SpeechGrammarList) {
          const grammarList = new SpeechGrammarList();
          const peerNames = Object.values(remotePeersRef.current || {}).map(p => p.name).filter(Boolean);
          const active = getAllNamingWords([localDisplayName, ...peerNames]);
          const grammarStr = buildJsgfGrammar(active);
          if (grammarStr) {
            grammarList.addFromString(grammarStr, 10.0);
            recognition.grammars = grammarList;
          }
        }
      } catch (gErr) {}

      recognition.onstart = () => {
        speechActiveRef.current = true;
        setSpeechActive(true);
      };

      recognition.onresult = async (event) => {
        let currentInterim = '';
        const peerNames = Object.values(remotePeersRef.current || {}).map(p => p.name).filter(Boolean);
        const activeNames = [localDisplayName, ...peerNames];

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcriptStr = res[0].transcript;
          if (res.isFinal) {
            let trimmed = transcriptStr.trim();
            if (trimmed.length > 0) {
              trimmed = normalizeTranscriptNamingWords(trimmed, activeNames);
              const nowSec = Math.max(0, Math.floor((Date.now() - meetingStartTimeRef.current) / 1000));
              const startSec = Math.max(0, nowSec - 3);
              const speaker = localDisplayName || (isLocalHost ? 'Host' : 'Guest');
              await handleSendTranscript(speaker, trimmed, startSec, nowSec);
            }
            setInterimText('');
          } else {
            currentInterim += transcriptStr;
          }
        }
        if (currentInterim) {
          setInterimText(normalizeTranscriptNamingWords(currentInterim, activeNames));
        } else {
          setInterimText('');
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn("Speech recognition notice:", e.error);
        }
        if (e.error === 'not-allowed') {
          setMediaBlockedNotice('Microphone speech recognition permission blocked in browser settings.');
        }
      };

      recognition.onend = () => {
        speechActiveRef.current = false;
        setSpeechActive(false);

        // Auto-restart if mic is still active (prevents stopping on 60s silence timeout)
        if (micEnabledRef.current) {
          if (recognitionRestartTimeoutRef.current) {
            clearTimeout(recognitionRestartTimeoutRef.current);
          }
          recognitionRestartTimeoutRef.current = setTimeout(() => {
            if (micEnabledRef.current) {
              startSpeechRecognitionSafe();
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start notice:", err);
      speechActiveRef.current = false;
      setSpeechActive(false);
    }
  };

  const initSpeechRecognition = () => {
    startSpeechRecognitionSafe();
  };

  const handleLanguageChange = (newLang) => {
    setSttLanguage(newLang);
    sttLanguageRef.current = newLang;
    try {
      localStorage.setItem('meeting_stt_language', newLang);
    } catch (e) {}

    if (micEnabledRef.current) {
      stopSpeechRecognitionSafe();
      setTimeout(() => {
        if (micEnabledRef.current) {
          startSpeechRecognitionSafe();
        }
      }, 300);
    }
    toast.info(`STT Language set to ${newLang === 'en-IN' ? 'English (India)' : newLang}`);
  };

  const handleAddCustomWord = () => {
    if (!newVocabWord.trim()) return;
    const word = newVocabWord.trim();
    saveCustomNamingWord(word);
    setNewVocabWord('');
    updateActiveNamingWords();
    toast.success(`Added "${word}" to Speech Naming Words!`);
  };

  const handleRemoveCustomWord = (word) => {
    removeCustomNamingWord(word);
    updateActiveNamingWords();
  };

  const handleStartEditTranscript = (segId, currentText) => {
    setEditingTranscriptId(segId);
    setEditingTranscriptText(currentText);
  };

  const handleSaveEditTranscript = async (tIndex, transcript) => {
    const peerNames = Object.values(remotePeersRef.current || {}).map(p => p.name).filter(Boolean);
    const activeNames = [localDisplayName, ...peerNames];
    const cleaned = normalizeTranscriptNamingWords(editingTranscriptText.trim(), activeNames);
    if (!cleaned) return;

    const segId = transcript.transcript_id || transcript.id || transcript._id || `trans_${tIndex}`;

    setTranscripts(prev => prev.map((item, i) => {
      if (i === tIndex || (item.transcript_id && item.transcript_id === segId)) {
        return { ...item, text: cleaned };
      }
      return item;
    }));

    setEditingTranscriptId(null);
    setEditingTranscriptText('');

    if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
      signalingWsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: JSON.stringify({
          type: 'transcript_edit',
          transcript_id: segId,
          text: cleaned,
          index: tIndex
        })
      }));
    }

    if (transcript.transcript_id || transcript.id) {
      const mId = meeting?.id || meeting?.meeting_code || code;
      try {
        await updateTranscriptSegment(mId, transcript.transcript_id || transcript.id, cleaned);
      } catch (err) {
        console.warn("Could not persist transcript edit to backend:", err);
      }
    }
  };

  const handleSendTranscript = async (speakerName, textStr, customStart = null, customEnd = null) => {
    if (!textStr || !textStr.trim()) return;

    const peerNames = Object.values(remotePeersRef.current || {}).map(p => p.name).filter(Boolean);
    const activeNames = [localDisplayName, ...peerNames];
    const cleanedText = normalizeTranscriptNamingWords(textStr.trim(), activeNames);

    const nowSec = Math.max(0, Math.floor((Date.now() - meetingStartTimeRef.current) / 1000));
    const startSec = customStart !== null ? customStart : Math.max(0, nowSec - 3);
    const endSec = customEnd !== null ? customEnd : nowSec + 1;

    const mId = meeting?.id || meeting?.meeting_code || code;

    const segment = {
      meeting_id: mId,
      participant_id: 'USER_LOCAL',
      speaker_name: speakerName,
      start_time: startSec,
      end_time: endSec,
      text: cleanedText,
      transcript_text: cleanedText,
      audio_base64: '',
      has_overlap: false
    };

    // 1. Instant local UI update
    setTranscripts(prev => {
      if (prev.some(t => t.text === segment.text && Math.abs(t.start_time - segment.start_time) < 2)) {
        return prev;
      }
      return [...prev, segment];
    });

    // 2. Broadcast via WebSocket for instant cross-device sync
    if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
      signalingWsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: JSON.stringify(segment)
      }));
    }

    // 3. Persist to MongoDB backend
    try {
      await transcribeSegment(mId, 'USER_LOCAL', segment);
      fetchTranscripts();
    } catch (err) {
      // Transcript is already saved in local state
    }
  };

  const handleManualTranscriptSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const peerNames = Object.values(remotePeersRef.current || {}).map(p => p.name).filter(Boolean);
    const activeNames = [localDisplayName, ...peerNames];
    const cleaned = normalizeTranscriptNamingWords(manualText.trim(), activeNames);
    const speaker = localDisplayName || (isLocalHost ? 'Host' : 'Guest');
    handleSendTranscript(speaker, cleaned);
    setManualText('');
  };

  // Toggle Microphone
  const toggleMic = async () => {
    if (!micEnabled) {
      // User wants to turn microphone ON
      const hasActiveTracks = audioStreamRef.current && 
        audioStreamRef.current.getAudioTracks().some(t => t.readyState === 'live');

      if (!hasActiveTracks) {
        if (!navigator?.mediaDevices?.getUserMedia) {
          toast.error('Microphone requires a secure connection (https:// or http://localhost:5173).');
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: { ideal: 48000 }
            }
          });
          audioStreamRef.current = stream;
          micEnabledRef.current = true;
          setMicEnabled(true);
          setMediaBlockedNotice(null);
          initAudioAnalyzer(stream);
          startSpeechRecognitionSafe();
          toast.success('Microphone unmuted and active.');

          // Attach audio track to all WebRTC peer connections
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            Object.values(peerConnectionsRef.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
              if (sender) {
                sender.replaceTrack(audioTrack);
              } else {
                pc.addTrack(audioTrack, stream);
              }
            });
          }

          if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
            signalingWsRef.current.send(JSON.stringify({
              type: 'media_state',
              media_state: { mic: true }
            }));
          }
        } catch (err) {
          micEnabledRef.current = false;
          setMicEnabled(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setMediaBlockedNotice('Microphone permission is blocked in your browser. Click the lock/tune icon 🔒 in the URL address bar ➔ Allow Microphone ➔ Click Retry.');
            toast.error('Microphone permission blocked by browser site settings.');
          } else if (err.name === 'NotFoundError') {
            toast.error('No microphone hardware detected.');
          } else {
            toast.error(`Unable to access microphone: ${err.message || err.name}`);
          }
        }
      } else {
        audioStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        const audioTrack = audioStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          Object.values(peerConnectionsRef.current).forEach(async pc => {
            const { audTransceiver } = getPeerTransceivers(pc);
            if (audTransceiver) {
              await audTransceiver.sender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, audioStreamRef.current);
            }
          });
        }
        micEnabledRef.current = true;
        setMicEnabled(true);
        startSpeechRecognitionSafe();
        toast.info('Microphone unmuted');

        if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
          signalingWsRef.current.send(JSON.stringify({
            type: 'media_state',
            media_state: { mic: true }
          }));
        }
      }
    } else {
      // User wants to mute microphone
      micEnabledRef.current = false;
      setMicEnabled(false);
      stopSpeechRecognitionSafe();

      if (audioStreamRef.current) {
        audioStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      setIsSpeaking(false);
      toast.info('Microphone muted');

      if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
        signalingWsRef.current.send(JSON.stringify({
          type: 'media_state',
          media_state: { mic: false }
        }));
      }
    }
  };

  // Toggle Web Camera
  const toggleCamera = async () => {
    if (!cameraEnabled) {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error('Camera requires a secure connection (https:// or http://localhost:5173).');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setCameraEnabled(true);
        setMediaBlockedNotice(null);
        toast.success('Web camera stream active.');

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            toast.warn('Camera disconnected or in use by another application.');
            toggleCamera();
          };

          for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
            const sender = camSendersRef.current[peerId];
            if (sender) {
              await sender.replaceTrack(videoTrack);
            } else {
              const newSender = pc.addTrack(videoTrack, stream);
              camSendersRef.current[peerId] = newSender;
            }
          }
        }

        if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
          signalingWsRef.current.send(JSON.stringify({
            type: 'media_state',
            media_state: { camera: true }
          }));
        }

        await renegotiatePeers();
      } catch (err) {
        setCameraEnabled(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMediaBlockedNotice('Camera permission is blocked in your browser. Click the lock/tune icon 🔒 in the URL address bar ➔ Allow Camera ➔ Click Retry.');
          toast.error('Camera permission blocked by browser site settings.');
        } else if (err.name === 'NotFoundError') {
          toast.error('No camera detected on this system.');
        } else if (err.name === 'NotReadableError') {
          toast.error('Camera is currently in use by another application (e.g., Zoom, Teams).');
        } else {
          toast.error(`Unable to access camera: ${err.message || err.name}`);
        }
      }
    } else {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraEnabled(false);
      toast.info('Camera stream closed.');

      for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
        const sender = camSendersRef.current[peerId];
        if (sender) {
          await sender.replaceTrack(null);
        }
      }

      if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
        signalingWsRef.current.send(JSON.stringify({
          type: 'media_state',
          media_state: { camera: false }
        }));
      }

      await renegotiatePeers();
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          }, 
          audio: true 
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        toast.success('Screen sharing started.');

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.contentHint = 'detail';

        // Add screen track specifically to all active peer connections
        for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
          const existingSender = screenSendersRef.current[peerId];
          if (existingSender) {
            await existingSender.replaceTrack(screenTrack);
          } else {
            const sender = pc.addTrack(screenTrack, screenStream);
            screenSendersRef.current[peerId] = sender;
          }
        }

        // Notify room via signaling FIRST with stream ID so remote peers associate it instantly
        if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
          signalingWsRef.current.send(JSON.stringify({
            type: 'media_state',
            media_state: { 
              screen: true,
              screen_stream_id: screenStream.id
            }
          }));
        }

        // Trigger renegotiation so remote peer decoders establish the screen track
        await renegotiatePeers();

        // Listen for native stop sharing event (browser top banner)
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        toast.info('Screen sharing cancelled or not supported.');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    toast.info('Screen sharing ended.');

    for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
      const sender = screenSendersRef.current[peerId];
      if (sender) {
        try { pc.removeTrack(sender); } catch (e) {}
        delete screenSendersRef.current[peerId];
      }
    }

    if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
      signalingWsRef.current.send(JSON.stringify({
        type: 'media_state',
        media_state: { screen: false }
      }));
    }

    await renegotiatePeers();
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const [exportingMoM, setExportingMoM] = useState(false);

  const handleExportMoM = async () => {
    try {
      setExportingMoM(true);
      toast.info('Generating official Minutes of Meeting (MoM) PDF...');
      const targetId = meeting?.id || code;
      await exportMeetingMoMPDF(targetId, `MoM_${code}.pdf`);
      toast.success('Minutes of Meeting (MoM) PDF downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to export MoM PDF.');
    } finally {
      setExportingMoM(false);
    }
  };


  const handleEndAndAnalyze = async () => {
    try {
      setAnalyzing(true);
      cleanupStreams();
      toast.info('Ending room session & compiling speaker transcripts...');
      const result = await endAndAnalyzeMeeting(code);
      toast.success('AI Meeting Analysis complete!');
      navigate(`/meetings/${result.id}`);
    } catch (err) {
      toast.error(err.message || 'Analysis failed. Redirecting to meetings list.');
      navigate('/meetings');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Bot size={48} color="var(--primary)" className="spin-slow" />
          <h3 style={{ marginTop: '1rem' }}>Joining Meeting Hall...</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Initializing WebRTC streams, VAD & Speech-to-Text</p>
        </div>
      </div>
    );
  }

  // Calculate active spotlight participant (pinned, speaking, or default)
  const activeSpotlightTarget = (() => {
    if (pinnedPeerId === 'local') return { type: 'local' };
    if (pinnedPeerId && remotePeers[pinnedPeerId]) {
      return { type: 'remote', peer: remotePeers[pinnedPeerId] };
    }
    const speakingRemote = Object.values(remotePeers).find(p => p.isSpeaking);
    if (speakingRemote) return { type: 'remote', peer: speakingRemote };
    if (isSpeaking) return { type: 'local' };
    const firstRemote = Object.values(remotePeers)[0];
    if (firstRemote) return { type: 'remote', peer: firstRemote };
    return { type: 'local' };
  })();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#090d16',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Main Grid Viewport */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Stage Content */}
        <div style={{
          flex: 1,
          padding: '1rem',
          paddingBottom: '6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto'
        }}>
          {/* Permission Blocked Guidance Banner */}
          {mediaBlockedNotice && (
            <div style={{
              backgroundColor: '#7f1d1d',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fee2e2',
              fontSize: '0.875rem',
              gap: '1rem',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={22} color="#f87171" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: '#ffffff', marginBottom: '0.2rem' }}>
                    Permissions Required
                  </strong>
                  <span>{mediaBlockedNotice}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    initAudioCaptureAndVAD();
                    if (!cameraEnabled) toggleCamera();
                  }}
                  style={{
                    backgroundColor: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Retry Access
                </button>
                <button
                  onClick={() => setMediaBlockedNotice(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    padding: '0.35rem'
                  }}
                  title="Dismiss notice"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Active Screen Share Viewport (Local User) */}
          {isScreenSharing && (
            <div style={{
              width: '100%',
              height: '60vh',
              minHeight: '380px',
              maxHeight: '680px',
              backgroundColor: '#070b14',
              borderRadius: '14px',
              overflow: 'hidden',
              position: 'relative',
              border: '2px solid var(--status-completed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)'
            }}>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backdropFilter: 'blur(4px)',
                zIndex: 5
              }}>
                <Monitor size={14} color="var(--status-completed)" />
                <span>You are sharing your screen</span>
              </div>
            </div>
          )}

          {/* Active Screen Share Viewport (Remote Peer) */}
          {!isScreenSharing && remoteScreenPeer && (
            <RemoteScreenViewport
              peer={remoteScreenPeer}
              stream={remoteScreenStreamsRef.current[remoteScreenPeer.peer_id]}
              pc={peerConnectionsRef.current[remoteScreenPeer.peer_id]}
            />
          )}

          {/* Active Collaborative Whiteboard & Notes Viewport */}
          {showWhiteboard && (
            <div style={{
              width: '100%',
              height: '60vh',
              minHeight: '380px',
              maxHeight: '680px'
            }}>
              <WhiteboardCanvas
                signalingWs={signalingWsRef.current}
                initialHistory={whiteboardHistory}
                initialNotes={meetingNotes}
                currentUser={user}
                onClose={() => setShowWhiteboard(false)}
              />
            </div>
          )}

          {/* Multi-Layout Participant Viewport */}
          {isStageExpanded ? (
            /* Layout A: Expanded Presentation (Screen Share or Whiteboard) with Filmstrip Below */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              overflowX: 'auto',
              padding: '0.5rem 0.25rem',
              maxHeight: '145px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }} className="custom-scrollbar-thin">
              <LocalVideoTile
                localVideoRef={localVideoRef}
                cameraEnabled={cameraEnabled}
                micEnabled={micEnabled}
                isSpeaking={isSpeaking}
                localDisplayName={localDisplayName}
                isLocalHost={isLocalHost}
                signalingStatus={signalingStatus}
                wsLatency={wsLatency}
                variant="filmstrip"
                isPinned={pinnedPeerId === 'local'}
                onClick={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
              />
              {Object.values(remotePeers).map((peer) => (
                <RemoteVideoTile
                  key={peer.peer_id}
                  peer={peer}
                  cameraStream={remoteCameraStreamsRef.current[peer.peer_id]}
                  audioStream={remoteAudioStreamsRef.current[peer.peer_id]}
                  pc={peerConnectionsRef.current[peer.peer_id]}
                  isScreenSharing={isAnyScreenSharing}
                  networkStats={peerNetworkStats[peer.peer_id]}
                  variant="filmstrip"
                  isPinned={pinnedPeerId === peer.peer_id}
                  onClick={() => setPinnedPeerId(pinnedPeerId === peer.peer_id ? null : peer.peer_id)}
                />
              ))}
            </div>
          ) : layoutMode === 'spotlight' ? (
            /* Layout B: Speaker Spotlight View (Large Center Stage + Compact Filmstrip) */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              gap: '0.85rem',
              minHeight: 0
            }}>
              {/* Spotlight Center Stage */}
              <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '360px'
              }}>
                {activeSpotlightTarget.type === 'local' ? (
                  <LocalVideoTile
                    localVideoRef={localVideoRef}
                    cameraEnabled={cameraEnabled}
                    micEnabled={micEnabled}
                    isSpeaking={isSpeaking}
                    localDisplayName={localDisplayName}
                    isLocalHost={isLocalHost}
                    signalingStatus={signalingStatus}
                    wsLatency={wsLatency}
                    variant="spotlight"
                    isPinned={pinnedPeerId === 'local'}
                    onPin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                  />
                ) : (
                  <RemoteVideoTile
                    key={activeSpotlightTarget.peer.peer_id}
                    peer={activeSpotlightTarget.peer}
                    cameraStream={remoteCameraStreamsRef.current[activeSpotlightTarget.peer.peer_id]}
                    audioStream={remoteAudioStreamsRef.current[activeSpotlightTarget.peer.peer_id]}
                    pc={peerConnectionsRef.current[activeSpotlightTarget.peer.peer_id]}
                    isScreenSharing={isAnyScreenSharing}
                    networkStats={peerNetworkStats[activeSpotlightTarget.peer.peer_id]}
                    variant="spotlight"
                    isPinned={pinnedPeerId === activeSpotlightTarget.peer.peer_id}
                    onPin={() => setPinnedPeerId(pinnedPeerId === activeSpotlightTarget.peer.peer_id ? null : activeSpotlightTarget.peer.peer_id)}
                  />
                )}
              </div>

              {/* Bottom Filmstrip Carousel */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                overflowX: 'auto',
                padding: '0.4rem 0.25rem',
                maxHeight: '135px'
              }} className="custom-scrollbar-thin">
                {/* Local User in Filmstrip (if remote is in spotlight) */}
                {activeSpotlightTarget.type !== 'local' && (
                  <LocalVideoTile
                    localVideoRef={localVideoRef}
                    cameraEnabled={cameraEnabled}
                    micEnabled={micEnabled}
                    isSpeaking={isSpeaking}
                    localDisplayName={localDisplayName}
                    isLocalHost={isLocalHost}
                    signalingStatus={signalingStatus}
                    wsLatency={wsLatency}
                    variant="filmstrip"
                    isPinned={pinnedPeerId === 'local'}
                    onClick={() => setPinnedPeerId('local')}
                  />
                )}

                {/* Remaining Remote Peers in Filmstrip */}
                {Object.values(remotePeers)
                  .filter(p => activeSpotlightTarget.type !== 'remote' || p.peer_id !== activeSpotlightTarget.peer.peer_id)
                  .map((peer) => (
                    <RemoteVideoTile
                      key={peer.peer_id}
                      peer={peer}
                      cameraStream={remoteCameraStreamsRef.current[peer.peer_id]}
                      audioStream={remoteAudioStreamsRef.current[peer.peer_id]}
                      pc={peerConnectionsRef.current[peer.peer_id]}
                      isScreenSharing={isAnyScreenSharing}
                      networkStats={peerNetworkStats[peer.peer_id]}
                      variant="filmstrip"
                      isPinned={pinnedPeerId === peer.peer_id}
                      onClick={() => setPinnedPeerId(peer.peer_id)}
                    />
                ))}

              </div>
            </div>
          ) : (
            /* Layout C: Gallery Grid View (Balanced Multi-Participant Cinema Grid) */
            <div style={{
              display: 'grid',
              gridTemplateColumns: (1 + Object.keys(remotePeers).length) <= 1
                ? 'minmax(320px, 920px)'
                : (1 + Object.keys(remotePeers).length) === 2
                  ? 'repeat(auto-fit, minmax(360px, 1fr))'
                  : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              justifyContent: 'center',
              alignContent: 'center',
              flex: 1
            }}>
              <LocalVideoTile
                localVideoRef={localVideoRef}
                cameraEnabled={cameraEnabled}
                micEnabled={micEnabled}
                isSpeaking={isSpeaking}
                localDisplayName={localDisplayName}
                isLocalHost={isLocalHost}
                signalingStatus={signalingStatus}
                wsLatency={wsLatency}
                variant="grid"
                isPinned={pinnedPeerId === 'local'}
                onPin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
              />

              {Object.values(remotePeers).map((peer) => (
                <RemoteVideoTile
                  key={peer.peer_id}
                  peer={peer}
                  cameraStream={remoteCameraStreamsRef.current[peer.peer_id]}
                  audioStream={remoteAudioStreamsRef.current[peer.peer_id]}
                  pc={peerConnectionsRef.current[peer.peer_id]}
                  isScreenSharing={isAnyScreenSharing}
                  networkStats={peerNetworkStats[peer.peer_id]}
                  variant="grid"
                  isPinned={pinnedPeerId === peer.peer_id}
                  onPin={(id) => setPinnedPeerId(pinnedPeerId === id ? null : id)}
                />
              ))}
            </div>
          )}

          {/* Live Speech Recognition Typing Preview Banner */}
          {interimText && (
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid var(--primary)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.85rem',
              color: '#38bdf8'
            }}>
              <Radio size={16} className="spin-slow" color="var(--primary)" />
              <span><strong>Transcribing Live:</strong> "{interimText}"</span>
            </div>
          )}
        </div>

        {/* Sidebar Panel (Roster / Live Transcripts) */}
        {(showRoster || showTranscripts) && (
          <div style={{
            width: '380px',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Sidebar Tabs & Close Action */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(15, 23, 42, 0.8)'
            }}>
              <button
                onClick={() => { setShowTranscripts(true); setShowRoster(false); }}
                style={{
                  flex: 1,
                  padding: '0.85rem 0.5rem',
                  backgroundColor: showTranscripts ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                  border: 'none',
                  borderBottom: showTranscripts ? '2px solid var(--primary)' : 'none',
                  color: showTranscripts ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <MessageSquare size={14} />
                <span>Transcripts ({transcripts.length})</span>
              </button>
              <button
                onClick={() => { setShowRoster(true); setShowTranscripts(false); }}
                style={{
                  flex: 1,
                  padding: '0.85rem 0.5rem',
                  backgroundColor: showRoster ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                  border: 'none',
                  borderBottom: showRoster ? '2px solid var(--primary)' : 'none',
                  color: showRoster ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Users size={14} />
                <span>Attendees ({1 + Object.keys(remotePeers).length})</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowRoster(false); setShowTranscripts(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close Side Panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Roster View */}
            {showRoster && (
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                  Connected Attendees ({1 + Object.keys(remotePeers).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* You */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: '#ffffff'
                      }}>
                        {localDisplayName.charAt(0)}
                      </div>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {localDisplayName} (You) {isLocalHost ? '• Host' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                        style={{
                          background: pinnedPeerId === 'local' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '0.2rem 0.4rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={pinnedPeerId === 'local' ? "Unpin spotlight" : "Spotlight yourself"}
                      >
                        <Pin size={12} style={{ transform: pinnedPeerId === 'local' ? 'rotate(45deg)' : 'none' }} />
                      </button>
                      {micEnabled ? <Mic size={15} color="#10b981" /> : <MicOff size={15} color="#ef4444" />}
                    </div>
                  </div>

                  {/* Connected Remote Peers */}
                  {Object.values(remotePeers).map(p => (
                    <div key={p.peer_id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: '#ffffff'
                        }}>
                          {p.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {p.name} {p.is_host ? '• Host' : '• Guest'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setPinnedPeerId(pinnedPeerId === p.peer_id ? null : p.peer_id)}
                          style={{
                            background: pinnedPeerId === p.peer_id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                            borderRadius: '6px',
                            padding: '0.2rem 0.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={pinnedPeerId === p.peer_id ? "Unpin spotlight" : "Spotlight participant"}
                        >
                          <Pin size={12} style={{ transform: pinnedPeerId === p.peer_id ? 'rotate(45deg)' : 'none' }} />
                        </button>
                        {p.media_state?.mic ? <Mic size={15} color="#10b981" /> : <MicOff size={15} color="#ef4444" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Transcripts View */}
            {showTranscripts && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* STT Language Selector & Naming Words Vocabulary Toolbar */}
                <div style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#0f172a',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Languages size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>STT Language:</span>
                      <select
                        value={sttLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="en-IN">English (India) — Recommended</option>
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="ta-IN">Tamil (India)</option>
                        <option value="hi-IN">Hindi (India)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowVocabManager(!showVocabManager)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        backgroundColor: showVocabManager ? 'var(--primary)' : 'rgba(99, 102, 241, 0.15)',
                        color: showVocabManager ? '#ffffff' : 'var(--primary)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Naming Words ({namingWordsList.length})</span>
                    </button>
                  </div>

                  {/* Collapsible Naming Words & Vocabulary Booster Manager */}
                  {showVocabManager && (
                    <div style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '6px',
                      padding: '0.65rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.72rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>
                          Active Naming Words & Proper Nouns:
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                          Auto-corrects phonetic speech variants
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '90px', overflowY: 'auto' }}>
                        {namingWordsList.map((word) => (
                          <span
                            key={word}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '4px',
                              padding: '0.15rem 0.45rem',
                              color: '#38bdf8',
                              fontSize: '0.7rem'
                            }}
                          >
                            {word}
                            {!DEFAULT_NAMING_WORDS.includes(word) && word !== localDisplayName && (
                              <X
                                size={10}
                                style={{ cursor: 'pointer', color: 'var(--text-dim)' }}
                                onClick={() => handleRemoveCustomWord(word)}
                              />
                            )}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <input
                          type="text"
                          placeholder="Add custom name (e.g. Viswaa)..."
                          value={newVocabWord}
                          onChange={(e) => setNewVocabWord(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomWord();
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: '#0f172a',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '0.25rem 0.5rem',
                            color: '#ffffff',
                            fontSize: '0.72rem'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomWord}
                          style={{
                            backgroundColor: 'var(--primary)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ffffff',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {transcripts.length > 0 ? (
                    transcripts.map((t, idx) => {
                      const segId = t.transcript_id || t.id || t._id || `trans_${idx}`;
                      const isEditing = editingTranscriptId === segId;

                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#1e293b',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            borderLeft: t.has_overlap ? '3px solid var(--status-delayed)' : '3px solid var(--primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <strong style={{ color: 'var(--primary)' }}>{t.speaker_name}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                [{Math.floor(t.start_time || 0)}s - {Math.floor(t.end_time || 0)}s]
                              </span>
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTranscript(segId, t.text)}
                                  title="Edit words or names in this transcript segment"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                              <input
                                type="text"
                                value={editingTranscriptText}
                                onChange={(e) => setEditingTranscriptText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditTranscript(idx, t);
                                  } else if (e.key === 'Escape') {
                                    setEditingTranscriptId(null);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  backgroundColor: '#0f172a',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '4px',
                                  padding: '0.3rem 0.5rem',
                                  color: '#ffffff',
                                  fontSize: '0.85rem'
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditTranscript(idx, t)}
                                style={{
                                  backgroundColor: 'var(--status-completed)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.3rem 0.55rem',
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTranscriptId(null)}
                                style={{
                                  backgroundColor: '#334155',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.3rem 0.55rem',
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>{t.text}</div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', paddingTop: '2rem' }}>
                      Speak into your microphone to generate live speech-to-text transcriptions.
                    </div>
                  )}
                </div>

                {/* Live Speech Recognition & Audio Input Engine Bar */}
                <div style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: '#1e293b',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {/* Live Status & STT Acoustic Model Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {micEnabled ? (
                        <>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: speechActive ? '#34d399' : '#38bdf8'
                          }}>
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: speechActive ? '#34d399' : '#38bdf8',
                              boxShadow: speechActive ? '0 0 8px #34d399' : '0 0 6px #38bdf8'
                            }} />
                            <span>{speechActive ? 'Speaking...' : 'Listening'}</span>
                          </span>
                          {speechActive && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '10px' }}>
                              <span className="speaking-eq-bar bar-1" />
                              <span className="speaking-eq-bar bar-2" />
                              <span className="speaking-eq-bar bar-3" />
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                          <span>Mic Muted</span>
                        </span>
                      )}
                    </div>

                    {/* STT Language Accent Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Languages size={12} color="#94a3b8" />
                      <select
                        value={sttLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        title="Speech Recognition Model & Accent"
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.2rem 0.45rem',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="en-IN">English (India)</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="en-AU">English (Australia)</option>
                      </select>
                    </div>
                  </div>

                  <form onSubmit={handleManualTranscriptSubmit} style={{ display: 'flex', gap: '0.45rem' }}>
                    <input
                      type="text"
                      placeholder="Type or paste spoken sentence..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#0f172a',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem',
                        color: '#ffffff',
                        fontSize: '0.8rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: 'var(--primary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Send Spoken Segment"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Glassmorphic Control Dock Island */}
      <div style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65), 0 0 25px rgba(99, 102, 241, 0.15)',
        borderRadius: '36px',
        padding: '0.55rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        maxWidth: '95vw'
      }}>
        {/* Primary Media Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Microphone */}
          <button
            type="button"
            onClick={toggleMic}
            className={`dock-pill-btn ${micEnabled ? 'active-success' : 'active-danger'}`}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micEnabled ? <Mic size={19} /> : <MicOff size={19} />}
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`dock-pill-btn ${cameraEnabled ? 'active-primary' : ''}`}
            title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraEnabled ? <Video size={19} /> : <VideoOff size={19} />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`dock-pill-btn ${isScreenSharing ? 'active-success' : ''}`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff size={19} /> : <Monitor size={19} />}
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Layout Switcher (Grid View & Spotlight View) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setLayoutMode('grid')}
            className={`dock-pill-btn ${layoutMode === 'grid' ? 'active-primary' : ''}`}
            title="Gallery Grid View"
          >
            <LayoutGrid size={18} />
          </button>

          <button
            type="button"
            onClick={() => setLayoutMode('spotlight')}
            className={`dock-pill-btn ${layoutMode === 'spotlight' ? 'active-primary' : ''}`}
            title="Speaker Spotlight View"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Collaboration Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Whiteboard */}
          <button
            type="button"
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            className={`dock-pill-btn ${showWhiteboard ? 'active-primary' : ''}`}
            title={showWhiteboard ? "Close Whiteboard" : "Open Collaborative Whiteboard & Notes"}
          >
            <PenTool size={18} />
          </button>

          {/* Transcripts Drawer */}
          <button
            type="button"
            onClick={() => {
              if (showTranscripts) {
                setShowTranscripts(false);
              } else {
                setShowTranscripts(true);
                setShowRoster(false);
              }
            }}
            className={`dock-pill-btn ${showTranscripts ? 'active-primary' : ''}`}
            title="Live Transcripts"
          >
            <MessageSquare size={18} />
            {transcripts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                borderRadius: '9999px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 5px',
                border: '1.5px solid #0f172a'
              }}>
                {transcripts.length}
              </span>
            )}
          </button>

          {/* Participants Drawer */}
          <button
            type="button"
            onClick={() => {
              if (showRoster) {
                setShowRoster(false);
              } else {
                setShowRoster(true);
                setShowTranscripts(false);
              }
            }}
            className={`dock-pill-btn ${showRoster ? 'active-primary' : ''}`}
            title="Participants Roster"
          >
            <Users size={18} />
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 5px',
              border: '1.5px solid #0f172a'
            }}>
              {1 + Object.keys(remotePeers).length}
            </span>
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Room Utilities: Re-sync, MoM PDF & Share Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Re-sync */}
          <button
            type="button"
            onClick={handleResyncMedia}
            className="dock-pill-btn"
            style={{ color: 'var(--status-completed)', borderColor: 'rgba(16, 185, 129, 0.35)' }}
            title="Re-sync Media & WebRTC Feeds"
          >
            <RefreshCw size={17} />
          </button>

          {/* MoM PDF */}
          <button
            type="button"
            onClick={handleExportMoM}
            disabled={exportingMoM}
            className="dock-pill-btn"
            style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.35)' }}
            title={exportingMoM ? "Generating Minutes of Meeting..." : "Download MoM PDF"}
          >
            <FileDown size={17} className={exportingMoM ? "spin-slow" : ""} />
          </button>

          {/* Share Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="dock-pill-btn"
            title={copied ? "Copied Link!" : "Copy Meeting Link"}
          >
            {copied ? <Check size={17} color="#10b981" /> : <Copy size={17} />}
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

        {/* End Meeting Button (Icon Only, No Words) */}
        <button
          type="button"
          onClick={handleEndAndAnalyze}
          disabled={analyzing}
          className="dock-pill-btn"
          style={{
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.5)'
          }}
          title={analyzing ? "Analyzing Meeting..." : "End & Analyze Meeting"}
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};

export default MeetingRoom;
