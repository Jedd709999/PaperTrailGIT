import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/common/Sidebar";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./components/users/Login";
import StudentDashboard from "./components/dashboard/StudentDashboard";
import ThesisPage from "./components/thesis/ThesisPage";
import ProfilePage from "./components/users/Profile";
import ManageUsersPage from "./components/users/ManageUsers";
import MyGroupsPage from "./components/groups/MyGroups";
import ReviewsPage from "./components/users/Reviews";
import ManageGroups from "./components/groups/ManageGroups";
import { useAuth } from "./auth/AuthContext";
import "./styles/academic-theme.css";

// Import new group proposal pages
import ManageGroupProposals from "./components/groups/GroupProposals/ManageGroupProposals";
import DebugGroupProposals from "./components/groups/GroupProposals/DebugGroupProposals";
import TestDataDisplay from "./components/groups/GroupProposals/TestDataDisplay"; // Add this import

// Dashboard components
import AdminDashboard from "./components/dashboard/AdminDashboard";
import AdviserDashboard from "./components/dashboard/AdviserDashboard";
import PanelDashboard from "./components/dashboard/PanelDashboard";

// Import the new DefenseScheduler component
import DefenseScheduler from "./components/thesis/DefenseScheduler";

// Import the new PanelGroups component
import PanelGroups from "./components/groups/PanelGroups";

// Import the new AdviserThesisView component
import AdviserThesisView from "./components/thesis/AdviserThesisView";

// Placeholder components for new routes
function NotificationsPage() {
  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: "Thesis Submission Approved",
      message: "Your thesis proposal has been approved by your adviser.",
      time: "2 hours ago",
      read: false,
      type: "success"
    },
    {
      id: 2,
      title: "New Document Review",
      message: "A new document requires your review.",
      time: "1 day ago",
      read: true,
      type: "info"
    },
    {
      id: 3,
      title: "Upcoming Defense Schedule",
      message: "Your thesis defense is scheduled for next week.",
      time: "2 days ago",
      read: false,
      type: "warning"
    }
  ];

  return (
    <div className="min-h-screen bg-academic-light py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-academic mb-6">
          <div className="card-academic-header">
            <h1 className="card-academic-title">Notifications</h1>
          </div>
          <div className="card-academic-body">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-academic-text">No notifications</h3>
                <p className="mt-1 text-academic-muted">You're all caught up! Check back later for new notifications.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 rounded-lg border ${
                      notification.read 
                        ? 'bg-academic-light border-academic-border' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 p-2 rounded-full ${
                        notification.type === 'success' ? 'bg-green-100 text-green-600' :
                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notification.type === 'success' && (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {notification.type === 'warning' && (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {notification.type === 'info' && (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-medium ${
                            notification.read ? 'text-academic-text' : 'text-academic-primary'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-academic-muted">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-academic-muted">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DefenseSchedulePage() {
  return (
    <div className="min-h-screen bg-academic-light flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-academic-text mb-4">Defense Schedule</h1>
        <p className="text-academic-muted">Defense schedule page content will be implemented here</p>
      </div>
    </div>
  );
}

function ManageGroupsPage() {
  return <ManageGroups />;
}

function ReportsPage() {
  return (
    <div className="min-h-screen bg-academic-light flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-academic-text mb-4">Reports</h1>
        <p className="text-academic-muted">Reports page content will be implemented here</p>
      </div>
    </div>
  );
}

function SystemLogsPage() {
  return (
    <div className="min-h-screen bg-academic-light flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-academic-text mb-4">System Logs</h1>
        <p className="text-academic-muted">System logs page content will be implemented here</p>
      </div>
    </div>
  );
}



function DefenseEvaluationsPage() {
  return (
    <div className="min-h-screen bg-academic-light flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-academic-text mb-4">Defense Evaluations</h1>
        <p className="text-academic-muted">Defense evaluations page content will be implemented here</p>
      </div>
    </div>
  );
}

function DefenseSchedulesPage() {
  return <DefenseScheduler />;
}

function App() {
  const { user, isLoggedIn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set sidebar open by default on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(true);
      }
    };

    // Check on initial load
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Mock notification count - in a real app, this would come from an API
  const [notificationCount] = useState(3);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!isLoggedIn || !user) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const userRole = user.role.toLowerCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar 
        role={userRole} 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto lg:ml-48">
        {/* Mobile header */}
        <header className="lg:hidden bg-academic-primary text-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <button 
              onClick={toggleSidebar}
              className="text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">PaperTrail</h1>
            <div className="w-6"></div> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6" style={{ zIndex: 10 }}>
          <div>
            <Routes>
              <Route
                path="/"
                element={<Navigate to={`/dashboard/${userRole}`} replace />}
              />

              {/* Dashboard routes */}
              <Route
                path="/dashboard"
                element={<Navigate to={`/dashboard/${userRole}`} replace />}
              />
              
              <Route
                path="/dashboard/student"
                element={
                  <ProtectedRoute allowedRole="student" currentRole={user?.role}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/dashboard/adviser"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <AdviserDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/dashboard/panel"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <PanelDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Group Proposal routes */}
              
              <Route
                path="/dashboard/admin/group-proposals"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <ManageGroupProposals />
                  </ProtectedRoute>
                }
              />
              


              {/* Thesis routes */}
              <Route
                path="/thesis"
                element={
                  <ProtectedRoute allowedRole={["student", "adviser"]} currentRole={user?.role}>
                    <ThesisPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Add the new adviser thesis view route */}
              <Route
                path="/adviser/thesis"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <AdviserThesisView />
                  </ProtectedRoute>
                }
              />
              
              {/* Profile routes */}
              <Route
                path="/dashboard/student/profile"
                element={
                  <ProtectedRoute allowedRole="student" currentRole={user?.role}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/profile"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/adviser/profile"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/panel/profile"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Student routes */}
              <Route
                path="/dashboard/student/notifications"
                element={
                  <ProtectedRoute allowedRole="student" currentRole={user?.role}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/student/defense"
                element={
                  <ProtectedRoute allowedRole="student" currentRole={user?.role}>
                    <DefenseSchedulePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/dashboard/admin/users"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <ManageUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/groups"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <ManageGroupsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/defense"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <DefenseSchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/reports"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/logs"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <SystemLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Adviser routes */}
              <Route
                path="/dashboard/adviser/groups"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <MyGroupsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/adviser/defense"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <DefenseSchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/adviser/notifications"
                element={
                  <ProtectedRoute allowedRole="adviser" currentRole={user?.role}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Student routes */}
              <Route
                path="/dashboard/student/groups"
                element={
                  <ProtectedRoute allowedRole="student" currentRole={user?.role}>
                    <MyGroupsPage />
                  </ProtectedRoute>
                }
              />

              {/* Panel routes */}
              <Route
                path="/dashboard/panel/reviews"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <ReviewsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/panel/groups"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <PanelGroups />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/panel/defense"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <DefenseEvaluationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/panel/schedules"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <DefenseSchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/panel/notifications"
                element={
                  <ProtectedRoute allowedRole="panel" currentRole={user?.role}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Debug routes - temporary for testing */}
              <Route
                path="/debug/group-proposals"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <DebugGroupProposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/debug/test-data"
                element={
                  <ProtectedRoute allowedRole="admin" currentRole={user?.role}>
                    <TestDataDisplay />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to={`/dashboard/${userRole}`} replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;