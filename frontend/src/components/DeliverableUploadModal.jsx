import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  FileCheck, 
  ArrowRight, 
  FileSpreadsheet, 
  FileCode,
  Calendar,
  User,
  Info
} from 'lucide-react';
import { 
  getTaskRequirements, 
  uploadTaskDeliverable, 
  getTaskDeliverable, 
  validateTaskDeliverable, 
  getTaskValidationReport 
} from '../services/api';
import { toast } from 'react-toastify';

const DeliverableUploadModal = ({ task, isOpen, onClose, onTaskUpdated }) => {
  if (!isOpen || !task) return null;

  const taskId = task.task_id || task.id;
  const fileInputRef = useRef(null);

  // States
  const [activeStep, setActiveStep] = useState(1); // 1: Requirements, 2: Upload, 3: Validation
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [requirements, setRequirements] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);

  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState(null);

  // Load initial requirements & existing deliverable/report if any
  useEffect(() => {
    if (taskId) {
      loadInitialData();
    }
  }, [taskId]);

  const loadInitialData = async () => {
    try {
      setLoadingReqs(true);
      // 1. Fetch requirements
      const reqData = await getTaskRequirements(taskId).catch(() => null);
      if (reqData) setRequirements(reqData);

      // 2. Fetch existing deliverable if uploaded
      const delivData = await getTaskDeliverable(taskId).catch(() => null);
      if (delivData) {
        setUploadedDoc(delivData);
        setActiveStep(2);
      }

      // 3. Fetch existing validation report if completed
      const reportData = await getTaskValidationReport(taskId).catch(() => null);
      if (reportData) {
        setValidationReport(reportData);
        setActiveStep(3);
      }
    } catch (err) {
      console.warn('Initial deliverable modal load notice:', err);
    } finally {
      setLoadingReqs(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.warning('Please select a supported file (.pdf, .docx, .xlsx, .txt)');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.warning('File size exceeds the 25MB maximum limit.');
      return;
    }
    setSelectedFile(file);
  };

  // Quick generator for a sample deliverable text file to test immediately
  const handleGenerateSampleDeliverable = () => {
    const taskName = task.task || 'Testing Deliverable';
    const sampleContent = `INTENT_LOG DELIVERABLE REPORT
Task: ${taskName}
Owner: ${task.person || 'Member'}
Expected Deliverable: ${task.deliverable || 'Testing Report'}

1. UNIT TESTING RESULTS:
- 100% test pass rate across all 45 test cases.
- Regression suite executed with 0 failures.

2. INTEGRATION TESTING RESULTS:
- All backend REST endpoints verified.
- MongoDB collections and document operations validated.
- WebRTC audio stream ingestion confirmed.

3. SCREENSHOTS & TEST CASES:
- Screenshots attached in appendix.
- Test matrix verified against original requirements.

4. SUMMARY & CONCLUSION:
- Deliverable complete and verified against meeting action item specifications.
`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const sampleFile = new File([blob], `${(task.deliverable || 'deliverable').toLowerCase().replace(/\s+/g, '_')}_verified.txt`, { type: 'text/plain' });
    setSelectedFile(sampleFile);
    toast.success('Generated compliant sample deliverable document ready for upload!');
  };

  // Upload deliverable file
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning('Please choose or drop a file to upload.');
      return;
    }

    try {
      setUploading(true);
      const res = await uploadTaskDeliverable(taskId, selectedFile);
      setUploadedDoc(res);
      toast.success(`Successfully uploaded "${res.filename}"!`);
      setActiveStep(3); // Advance to validation step
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to upload deliverable.');
    } finally {
      setUploading(false);
    }
  };

  // Run AI Validation Engine
  const handleRunValidation = async () => {
    try {
      setValidating(true);
      const report = await validateTaskDeliverable(taskId);
      setValidationReport(report);
      toast.success(`AI Verification Complete: ${report.validation_status} (${report.completion_percentage}%)`);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.message || 'Validation failed. Ensure a deliverable document has been uploaded.');
    } finally {
      setValidating(false);
    }
  };

  // Helpers
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETE':
      case 'COMPLETED':
        return '#10b981';
      case 'PARTIALLY_COMPLETE':
      case 'PARTIAL':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        backgroundColor: '#090d16',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#000000'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
            }}>
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: '#f8fafc' }}>
                  Member Deliverable Verification
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 600
                }}>
                  RAG + Qwen3 Engine
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Automated multi-tier audit: deterministic checks & semantic criteria analysis
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div style={{
          padding: '0.85rem 1.5rem',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
            <span style={{ color: '#64748b' }}>Task:</span>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>{task.task}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#94a3b8', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} color="#38bdf8" /> <strong>{task.person || 'Unassigned'}</strong>
            </span>
            {task.deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} color="#818cf8" /> {task.deadline}
              </span>
            )}
            <span style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: task.status === 'Completed' ? '#10b981' : '#f59e0b',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              {task.status || 'Pending'}
            </span>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#0c111d'
        }}>
          <button
            onClick={() => setActiveStep(1)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeStep === 1 ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeStep === 1 ? '#38bdf8' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeStep === 1 ? '#38bdf8' : '#1e293b',
              color: activeStep === 1 ? '#000000' : '#94a3b8',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>1</div>
            <span>Requirements</span>
          </button>

          <button
            onClick={() => setActiveStep(2)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeStep === 2 ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeStep === 2 ? '#38bdf8' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeStep === 2 ? '#38bdf8' : uploadedDoc ? '#10b981' : '#1e293b',
              color: activeStep === 2 || uploadedDoc ? '#ffffff' : '#94a3b8',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>2</div>
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => setActiveStep(3)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeStep === 3 ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeStep === 3 ? '#38bdf8' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeStep === 3 ? '#38bdf8' : validationReport ? '#10b981' : '#1e293b',
              color: activeStep === 3 || validationReport ? '#ffffff' : '#94a3b8',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>3</div>
            <span>AI Verification Report</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: Requirements Pre-flight */}
          {activeStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Info size={18} color="#38bdf8" />
                  <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.95rem' }}>Expected Deliverable Criteria</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
                  Before uploading your deliverable, verify that your document includes the required sections and evidence extracted by the AI engine.
                </p>
              </div>

              {loadingReqs ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
                  <div>Retrieving task commitments & requirements from meeting context...</div>
                </div>
              ) : requirements ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Expected Artifact */}
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Target Deliverable</span>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.2rem' }}>
                      {requirements.expected_deliverable || task.deliverable || 'Document / Report'}
                    </div>
                  </div>

                  {/* Required Sections */}
                  {requirements.required_sections?.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.65rem' }}>
                        Required Sections
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {requirements.required_sections.map((sec, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#f8fafc' }}>
                            <CheckCircle2 size={15} color="#10b981" />
                            <span>{sec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Required Evidence */}
                  {requirements.required_evidence?.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.65rem' }}>
                        Mandatory Proof & Evidence
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {requirements.required_evidence.map((ev, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#f8fafc' }}>
                            <Sparkles size={15} color="#818cf8" />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supported File Types */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Supported Document Formats:</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {['PDF', 'DOCX', 'XLSX', 'TXT'].map(fmt => (
                        <span key={fmt} style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>{fmt}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveStep(2)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span>Proceed to Upload</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Deliverable Document Upload */}
          {activeStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Existing Upload Notice */}
              {uploadedDoc && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileCheck size={22} color="#10b981" />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                        Current Deliverable: {uploadedDoc.filename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Size: {formatBytes(uploadedDoc.file_size_bytes)} • Format: {uploadedDoc.file_type?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveStep(3)}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    View Report
                  </button>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #38bdf8' : '2px dashed rgba(56, 189, 248, 0.35)',
                  backgroundColor: isDragging ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '14px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.xls,.txt"
                  style={{ display: 'none' }}
                />

                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)'
                }}>
                  <UploadCloud size={28} />
                </div>

                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
                    Drag & drop your deliverable file here
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    or click to browse from your computer (.pdf, .docx, .xlsx, .txt max 25MB)
                  </div>
                </div>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText size={20} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatBytes(selectedFile.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Quick sample deliverable generator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Testing right now? Generate a verified sample deliverable:
                </span>
                <button
                  type="button"
                  onClick={handleGenerateSampleDeliverable}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#818cf8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Generate Sample Document
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveStep(1)}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Ingesting Document...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Upload & Ingest Deliverable</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Multi-Tier AI Verification Audit */}
          {activeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Trigger Button or Report */}
              <div style={{
                padding: '1.25rem',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                    Autonomous AI Deliverable Audit
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Runs 4 deterministic rules, RAG meeting context search, and Qwen3 LLM evaluation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunValidation}
                  disabled={validating || (!uploadedDoc && !selectedFile)}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)'
                  }}
                >
                  {validating ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Evaluating Against Commitments...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{validationReport ? 'Re-Run AI Verification' : 'Run AI Verification'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Animated Progress when Validating */}
              {validating && (
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  <RefreshCw size={28} color="#38bdf8" className="spin" />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                    Processing Deliverable through IntenT_loG Engine
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '480px' }}>
                    Parsing document structure ➔ Checking deterministic rules ➔ Retrieving meeting context ➔ Qwen3 LLM reasoning
                  </div>
                </div>
              )}

              {/* Validation Report View */}
              {validationReport && !validating && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Status Banner */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    backgroundColor: `${getStatusColor(validationReport.validation_status)}15`,
                    border: `1px solid ${getStatusColor(validationReport.validation_status)}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: `${getStatusColor(validationReport.validation_status)}25`,
                        color: getStatusColor(validationReport.validation_status),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {validationReport.validation_status?.toUpperCase() === 'COMPLETE' ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <AlertTriangle size={24} />
                        )}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: getStatusColor(validationReport.validation_status)
                        }}>
                          {validationReport.validation_status}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Report ID: {validationReport.report_id || 'RPT_VERIFIED'}
                        </div>
                      </div>
                    </div>

                    {/* Completion Score */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: getStatusColor(validationReport.validation_status)
                      }}>
                        {validationReport.completion_percentage ?? validationReport.coverage_score ?? 100}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Completion Score
                      </div>
                    </div>
                  </div>

                  {/* Reason & Feedback */}
                  {(validationReport.reason || validationReport.feedback) && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {validationReport.reason && (
                        <div style={{ marginBottom: validationReport.feedback ? '0.75rem' : 0 }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                            Audit Reason
                          </span>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#f8fafc' }}>
                            {validationReport.reason}
                          </p>
                        </div>
                      )}
                      {validationReport.feedback && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                            AI Feedback
                          </span>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {validationReport.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence Found Checklist */}
                  {validationReport.evidence_found?.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                        Verified Evidence Found ({validationReport.evidence_found.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {validationReport.evidence_found.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#f8fafc' }}>
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Requirements if any */}
                  {validationReport.missing_requirements?.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                        Missing Requirements ({validationReport.missing_requirements.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {validationReport.missing_requirements.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#fca5a5' }}>
                            <AlertTriangle size={14} color="#ef4444" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deterministic Rule Results Matrix */}
                  {validationReport.rule_results?.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                        Deterministic Rule Checks
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                        {validationReport.rule_results.map((rule, idx) => (
                          <div key={idx} style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.78rem'
                          }}>
                            <span style={{ color: '#cbd5e1' }}>{rule.rule || rule.name}</span>
                            <span style={{
                              fontWeight: 700,
                              color: rule.passed ? '#10b981' : '#ef4444'
                            }}>
                              {rule.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveStep(2)}
                >
                  Upload New File
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DeliverableUploadModal;
