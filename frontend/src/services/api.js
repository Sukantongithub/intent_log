import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

// Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let customMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.response) {
      const data = error.response.data;
      if (typeof data?.detail === 'string') {
        customMessage = data.detail;
      } else if (Array.isArray(data?.detail)) {
        customMessage = data.detail.map((err) => err.msg).join(', ');
      } else if (data?.message) {
        customMessage = data.message;
      }
    } else if (error.request) {
      customMessage = `Unable to connect to backend server at ${API_BASE_URL}. Please ensure the backend server and ngrok tunnel are running.`;
    } else {
      customMessage = error.message;
    }

    return Promise.reject(new Error(customMessage));
  }
);

// Meetings API
export const getMeetings = async (params = {}) => {
  const response = await api.get('/meetings', { params });
  return response.data;
};

export const getMeeting = async (id) => {
  const response = await api.get(`/meetings/${id}`);
  return response.data;
};

export const scheduleMeeting = async (payload = {}) => {
  const response = await api.post('/meetings/schedule', payload);
  return response.data;
};

export const getMeetingByCode = async (code) => {
  const response = await api.get(`/meetings/code/${code}`);
  return response.data;
};

export const endAndAnalyzeMeeting = async (code) => {
  const response = await api.post(`/meetings/code/${code}/end-and-analyze`);
  return response.data;
};

export const createMeeting = async (meetingData) => {
  const response = await api.post('/meetings', meetingData);
  return response.data;
};

export const deleteMeeting = async (id) => {
  const response = await api.delete(`/meetings/${id}`);
  return response.data;
};

export const validateMeeting = async (id, progressUpdate) => {
  const response = await api.post(`/meetings/${id}/validate`, { progress_update: progressUpdate });
  return response.data;
};

export const exportMeetingMoMPDF = async (meetingId, customFilename) => {
  const response = await api.get(`/meetings/${meetingId}/export-mom-pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = customFilename || `MoM_${meetingId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};

// Auth & Users API
export const createOrganization = async (orgData) => {
  const response = await api.post('/organizations', orgData);
  return response.data;
};

export const getOrganizations = async () => {
  const response = await api.get('/organizations');
  return response.data;
};

export const dropOrganization = async (orgId) => {
  const response = await api.delete(`/organizations/${orgId}`);
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/users/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/users/login', credentials);
  return response.data;
};

export const getAllUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data;
};

export const updateUserStatus = async (userId, status) => {
  const response = await api.patch(`/users/${userId}/status`, { status });
  return response.data;
};

export const updateUserProfile = async (userId, profileData) => {
  const response = await api.patch(`/users/${userId}/profile`, profileData);
  return response.data;
};

export const deleteUserAccount = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

// Admin Control Panel API
export const getAdminMetrics = async (params = {}) => {
  const response = await api.get('/admin/metrics', { params });
  return response.data;
};

export const getAdminAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/logs', { params });
  return response.data;
};

export const adminDeleteMeeting = async (meetingId) => {
  const response = await api.delete(`/admin/meetings/${meetingId}`);
  return response.data;
};

export const adminReanalyzeMeeting = async (meetingId) => {
  const response = await api.post(`/admin/meetings/${meetingId}/reanalyze`);
  return response.data;
};

export const adminDeleteTask = async (taskId) => {
  const response = await api.delete(`/admin/tasks/${taskId}`);
  return response.data;
};

// Participants & Transcripts API
export const joinMeeting = async (meetingId, payload) => {
  const response = await api.post(`/meetings/${meetingId}/join`, payload);
  return response.data;
};

export const getMergedTranscript = async (meetingId) => {
  const response = await api.get(`/meetings/${meetingId}/merged-transcript`);
  return response.data;
};

export const transcribeSegment = async (meetingId, userId, payload) => {
  const response = await api.post(`/meetings/${meetingId}/participants/${userId}/transcribe`, payload);
  return response.data;
};

export const updateTranscriptSegment = async (meetingId, transcriptId, text) => {
  const response = await api.patch(`/meetings/${meetingId}/transcripts/${transcriptId}`, { text });
  return response.data;
};

// Tasks API
export const getTasks = async (params = {}) => {
  const response = await api.get('/tasks', { params });
  return response.data;
};

export const getTask = async (id) => {
  const response = await api.get(`/tasks/${id}`);
  return response.data;
};

export const updateTaskStatus = async (id, status) => {
  const response = await api.patch(`/tasks/${id}/status`, { status });
  return response.data;
};

// Task Deliverable & Validation API (Checkpoints 7 - 15)
export const getTaskRequirements = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/requirements`);
  return response.data;
};

export const uploadTaskDeliverable = async (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/tasks/${taskId}/deliverable/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getTaskDeliverable = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/deliverable`);
  return response.data;
};

export const validateTaskDeliverable = async (taskId) => {
  const response = await api.post(`/tasks/${taskId}/validate-deliverable`);
  return response.data;
};

export const getTaskValidationReport = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/validation-report`);
  return response.data;
};

// Projects & Project Management API
export const getProjects = async (params = {}) => {
  const response = await api.get('/projects', { params });
  return response.data;
};

export const getProject = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await api.post('/projects', projectData);
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await api.patch(`/projects/${id}`, projectData);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

export const addProjectMilestone = async (projectId, milestoneData) => {
  const response = await api.post(`/projects/${projectId}/milestones`, milestoneData);
  return response.data;
};

export const updateProjectMilestone = async (projectId, milestoneId, updateData) => {
  const response = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, updateData);
  return response.data;
};

export const deleteProjectMilestone = async (projectId, milestoneId) => {
  const response = await api.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  return response.data;
};

export const linkMeetingToProject = async (projectId, meetingId) => {
  const response = await api.post(`/projects/${projectId}/link-meeting`, { meeting_id: meetingId });
  return response.data;
};

export const createProjectTask = async (projectId, taskData) => {
  const response = await api.post(`/projects/${projectId}/tasks`, taskData);
  return response.data;
};

// Health Check API
export const healthCheck = async () => {
  const rootUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  const response = await axios.get(`${rootUrl}/health`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  return response.data;
};

export default api;
