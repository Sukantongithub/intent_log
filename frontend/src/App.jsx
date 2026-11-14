import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Loading from './components/Loading';

// Lazy-loaded pages for dynamic code-splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateMeeting = lazy(() => import('./pages/CreateMeeting'));
const Meetings = lazy(() => import('./pages/Meetings'));
const MeetingDetails = lazy(() => import('./pages/MeetingDetails'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Validation = lazy(() => import('./pages/Validation'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TaskCalendar = lazy(() => import('./pages/TaskCalendar'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Settings = lazy(() => import('./pages/Settings'));

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading fullScreen text="Loading IntenT_loG..." />}>
          <Routes>
            {/* Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Fullscreen Live Google Meet Room Route */}
            <Route path="/room/:code" element={<MeetingRoom />} />

            {/* Standard Layout Routes */}
            <Route
              path="/*"
              element={
                <div className="app-container">
                  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                  <div className={`main-wrapper ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                    <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                    <main className="page-content">
                      <Suspense fallback={<Loading text="Loading view..." />}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/meetings" element={<Meetings />} />
                          <Route path="/meetings/create" element={<CreateMeeting />} />
                          <Route path="/meetings/:id" element={<MeetingDetails />} />
                          <Route path="/projects" element={<Projects />} />
                          <Route path="/projects/:id" element={<ProjectDetails />} />
                          <Route path="/tasks" element={<Tasks />} />
                          <Route path="/calendar" element={<TaskCalendar />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/validation/:id" element={<Validation />} />
                          <Route path="/validation" element={<Navigate to="/tasks" replace />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>

        {/* Global Toast Notification Container */}
        <ToastContainer
          position="bottom-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
