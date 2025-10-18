import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisTopics, fetchThesisDocuments, fetchStudentGroups, fetchNotifications, fetchDefenseSchedules, fetchThesisStatusHistory } from "../../services/api";
import "../../styles/academic-theme.css";

interface DashboardStats {
  thesisStatus: string;
  documentsUploaded: number;
  pendingTasks: number;
  upcomingDeadlines: string[];
}

interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: string;
  title: string;
  user: any;
  thesis: any;
}

interface RecentActivity {
  id: number;
  action: string;
  date: string;
  type: string;
}

interface StatusHistory {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  changed_at: string;
  notes: string;
}

interface Adviser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface StudentGroup {
  id: number;
  name: string;
  students: any[];
  adviser: Adviser;
}

interface ThesisProgress {
  overall_progress: number;
  steps: {
    name: string;
    status: string; // updated to allow all status types
  }[];
}

function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    thesisStatus: "Loading...",
    documentsUploaded: 0,
    pendingTasks: 0,
    upcomingDeadlines: [],
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [adviser, setAdviser] = useState<Adviser | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [thesisProgress, setThesisProgress] = useState<ThesisProgress>({
    overall_progress: 0,
    steps: [],
  });
  const [studentGroup, setStudentGroup] = useState<StudentGroup | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px, hide header
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or near top, show header
        setHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const fetchStudentData = async (isRetryAttempt = false) => {
    if (isRetryAttempt) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
    }
    try {
      const token = localStorage.getItem("access");
      if (!token) {
        setError("No authentication token found. Please log in again.");
        setLoading(false);
        setIsRetrying(false);
        return;
      }

      // Fetch thesis topics to get status
      let thesisData: any[] = [];
      try {
        thesisData = await fetchThesisTopics();
        if (Array.isArray(thesisData) && thesisData.length > 0) {
          const latestThesis = thesisData[0];
          setStats(prev => ({
            ...prev,
            thesisStatus: latestThesis.status || "No topic submitted",
          }));
        }
      } catch (thesisError) {
        console.warn("Thesis topics fetch failed:", thesisError);
        setStats(prev => ({
          ...prev,
          thesisStatus: "Unable to load thesis status",
        }));
      }

      // Fetch thesis status history if we have thesis data
      if (Array.isArray(thesisData) && thesisData.length > 0) {
        try {
          const latestThesis = thesisData[0];
          const statusHistoryData = await fetchThesisStatusHistory(latestThesis.id);
          setStatusHistory(Array.isArray(statusHistoryData) ? statusHistoryData : []);
        } catch (historyError) {
          console.warn("Status history fetch failed:", historyError);
          // Don't set error for status history failure - it's not critical
        }
      }

      // Fetch thesis documents
      try {
        const docsData = await fetchThesisDocuments();
        setStats(prev => ({
          ...prev,
          documentsUploaded: Array.isArray(docsData) ? docsData.length : 0,
        }));
      } catch (docsError) {
        console.warn("Documents fetch failed:", docsError);
        setStats(prev => ({
          ...prev,
          documentsUploaded: 0,
        }));
      }

      // Fetch student groups to get adviser info and group details
      try {
        const groupsData = await fetchStudentGroups();
        if (Array.isArray(groupsData) && groupsData.length > 0) {
          const studentGroup = groupsData[0];
          setStudentGroup(studentGroup);
          if (studentGroup.adviser) {
            setAdviser(studentGroup.adviser);
          }
        }
      } catch (groupsError) {
        console.warn("Student groups fetch failed:", groupsError);
        // Don't set error for groups failure - not critical
      }

      // Fetch notifications for recent activity
      let notificationsData: Notification[] = [];
      try {
        notificationsData = await fetchNotifications();
        const activities = Array.isArray(notificationsData)
          ? notificationsData.slice(0, 5).map((notif, index) => ({
              id: notif.id || index + 1,
              action: notif.message || "System notification",
              date: new Date(notif.created_at).toLocaleDateString(),
              type: notif.notification_type || "submission",
            }))
          : [];
        setRecentActivity(activities);
      } catch (notificationsError) {
        console.warn("Notifications fetch failed:", notificationsError);
        // Don't set error for notifications failure - not critical
      }

      // Calculate thesis progress based on actual thesis status
      let thesisStatus = "No topic submitted";
      let steps = [
        { name: "Topic Selection", status: "pending" },
        { name: "Proposal Submission", status: "pending" },
        { name: "Chapter 1 Draft", status: "pending" },
        { name: "Final Thesis", status: "pending" },
        { name: "Defense", status: "pending" },
      ];
      let overallProgress = 0;

      if (Array.isArray(thesisData) && thesisData.length > 0) {
        const latestThesis = thesisData[0];
        thesisStatus = latestThesis.status || "No topic submitted";
        
        // Map backend thesis statuses to frontend progress
        switch (latestThesis.status) {
          case "Approved":
            steps[0].status = "completed";
            steps[1].status = "completed";
            steps[2].status = "completed";
            steps[3].status = "completed";
            steps[4].status = "completed";
            overallProgress = 100;
            break;
          case "Defense Completed":
          case "Final Review":
            steps[0].status = "completed";
            steps[1].status = "completed";
            steps[2].status = "completed";
            steps[3].status = "completed";
            steps[4].status = "in_progress";
            overallProgress = 90;
            break;
          case "Writing Phase":
          case "Draft Review":
            steps[0].status = "completed";
            steps[1].status = "completed";
            steps[2].status = "completed";
            steps[3].status = "in_progress";
            steps[4].status = "pending";
            overallProgress = 75;
            break;
          case "Research Phase":
            steps[0].status = "completed";
            steps[1].status = "completed";
            steps[2].status = "in_progress";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 50;
            break;
          case "Proposal Approved":
            steps[0].status = "completed";
            steps[1].status = "completed";
            steps[2].status = "pending";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 40;
            break;
          case "Proposal Review":
          case "Proposal Revision":
            steps[0].status = "completed";
            steps[1].status = "in_progress";
            steps[2].status = "pending";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 25;
            break;
          case "Topic Approved":
            steps[0].status = "completed";
            steps[1].status = "pending";
            steps[2].status = "pending";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 15;
            break;
          case "Topic Review":
          case "Topic Rejected":
            steps[0].status = "in_progress";
            steps[1].status = "pending";
            steps[2].status = "pending";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 10;
            break;
          case "Topic Submission":
          default:
            // No topic submitted or unknown status
            steps[0].status = "pending";
            steps[1].status = "pending";
            steps[2].status = "pending";
            steps[3].status = "pending";
            steps[4].status = "pending";
            overallProgress = 0;
            break;
        }
      }

      setThesisProgress({
        overall_progress: overallProgress,
        steps: steps,
      });

      // Fetch defense schedules for deadlines
      try {
        let upcomingDeadlines = [];
        const deadlinesData = await fetchDefenseSchedules();
        if (Array.isArray(deadlinesData)) {
          upcomingDeadlines = deadlinesData
            .filter(defense => new Date(defense.date) > new Date())
            .slice(0, 5)
            .map(defense => {
              const date = new Date(defense.date);
              return `Defense - ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            });
        }

        // If no defense deadlines, add thesis-related deadlines based on status
        if (upcomingDeadlines.length === 0) {
          const today = new Date();
          if (steps[0].status === "pending") {
            upcomingDeadlines.push("Topic Submission - " + new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString());
          }
          if (steps[1].status === "in_progress" || steps[1].status === "pending") {
            upcomingDeadlines.push("Proposal Submission - " + new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString());
          }
          if (steps[2].status === "in_progress" || steps[2].status === "pending") {
            upcomingDeadlines.push("Chapter 1 Draft - " + new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());
          }
        }

        // Calculate pending tasks based on actual status
        let pendingTasks = 0;
        if (steps[0].status === "pending") pendingTasks++;
        if (steps[1].status === "in_progress" || steps[1].status === "pending") pendingTasks++;
        if (steps[2].status === "in_progress" || steps[2].status === "pending") pendingTasks++;
        if (steps[3].status === "in_progress" || steps[3].status === "pending") pendingTasks++;
        if (steps[4].status === "in_progress" || steps[4].status === "pending") pendingTasks++;
        
        // Add pending tasks from notifications
        if (Array.isArray(notificationsData)) {
          const unreadNotifications = notificationsData.filter(notif => !notif.is_read);
          pendingTasks += unreadNotifications.length;
        }

        setStats(prev => ({
          ...prev,
          thesisStatus: thesisStatus,
          upcomingDeadlines: upcomingDeadlines,
          pendingTasks: pendingTasks,
        }));
      } catch (deadlinesError) {
        console.warn("Defense schedules fetch failed:", deadlinesError);
        // Set basic deadlines if fetch fails
        const today = new Date();
        const basicDeadlines = [];
        if (steps[0].status === "pending") {
          basicDeadlines.push("Topic Submission - " + new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString());
        }
        if (steps[1].status === "in_progress" || steps[1].status === "pending") {
          basicDeadlines.push("Proposal Submission - " + new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString());
        }
        if (steps[2].status === "in_progress" || steps[2].status === "pending") {
          basicDeadlines.push("Chapter 1 Draft - " + new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());
        }

        let pendingTasks = 0;
        if (steps[0].status === "pending") pendingTasks++;
        if (steps[1].status === "in_progress" || steps[1].status === "pending") pendingTasks++;
        if (steps[2].status === "in_progress" || steps[2].status === "pending") pendingTasks++;
        if (steps[3].status === "in_progress" || steps[3].status === "pending") pendingTasks++;
        if (steps[4].status === "in_progress" || steps[4].status === "pending") pendingTasks++;

        setStats(prev => ({
          ...prev,
          thesisStatus: thesisStatus,
          upcomingDeadlines: basicDeadlines,
          pendingTasks: pendingTasks,
        }));
      }

      // Clear any previous errors and set loading to false
      setError(null);
      setLoading(false);
      setIsRetrying(false);
    } catch (error) {
      console.error("Dashboard data fetch failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data. Please try again.";
      setError(errorMessage);
      setLoading(false);
      setIsRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="container-academic section-academic">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner-academic mx-auto mb-4"></div>
            <p className="text-academic-text">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-academic section-academic">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-academic-error mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-academic-error mb-2">{error}</p>
            <button 
              onClick={() => fetchStudentData(true)}
              className="btn-academic"
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Dashboard Header */}
      <div className="dashboard-header-academic sticky top-0 z-40">
        <h1 className="text-3xl font-semibold mb-1">Welcome, {user?.first_name || user?.username}</h1>
        <p className="text-base opacity-90 max-w-none">
          {studentGroup ? `Group: ${studentGroup.name}` : "Track your thesis progress"}
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="stat-grid-academic gap-3 mb-4 mt-6">
        <div className="stat-card-academic groups p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Thesis Status">Thesis Status</p>
          <p className="stat-value-academic text-lg">{stats.thesisStatus}</p>
        </div>

        <div className="stat-card-academic students p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Documents">Documents</p>
          <p className="stat-value-academic text-lg">{stats.documentsUploaded}</p>
        </div>

        <div className="stat-card-academic theses p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002 2" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Pending Tasks">Pending Tasks</p>
          <p className="stat-value-academic text-lg">{stats.pendingTasks}</p>
        </div>

        <div className="stat-card-academic reviews p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Progress">Progress</p>
          <p className="stat-value-academic text-lg">{thesisProgress.overall_progress}%</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Main content area with Quick Actions on the right and 2x2 grid on the left */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 2x2 Grid for recent activity, upcoming deadlines, document status, and adviser info - on the left */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Recent Activity */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Recent Activity">Recent Activity</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-1.5">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-1 pb-1.5 border-b border-academic-border last:border-0 last:pb-0">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={`p-1 rounded-lg ${
                              activity.type === 'upload' ? 'bg-blue-100' :
                              activity.type === 'feedback' ? 'bg-green-100' :
                              activity.type === 'submission' ? 'bg-purple-100' : 'bg-academic-primary bg-opacity-10'
                            }`}>
                              {activity.type === 'upload' && (
                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              {activity.type === 'feedback' && (
                                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9 8s9 3.582 9 8z" />
                                </svg>
                              )}
                              {activity.type === 'submission' && (
                                <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {!activity.type || !['upload', 'feedback', 'submission'].includes(activity.type) && (
                                <svg className="w-3 h-3 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-academic-text text-xs font-medium truncate" title={activity.action}>{activity.action}</p>
                            <p className="text-xs text-academic-muted mt-0.5 truncate">{activity.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2">
                        <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-academic-muted text-xs">No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upcoming Deadlines - Enhanced Timeline View */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Upcoming Deadlines">Upcoming Deadlines</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-1.5">
                    {stats.upcomingDeadlines.length > 0 ? (
                      stats.upcomingDeadlines.map((deadline, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex flex-col items-center mr-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-academic-primary"></div>
                            {index < stats.upcomingDeadlines.length - 1 && (
                              <div className="w-0.5 h-full bg-academic-border mt-0.5"></div>
                            )}
                          </div>
                          <div className="pb-1.5 flex-1 min-w-0">
                            <p className="text-academic-text text-xs font-medium truncate" title={deadline}>{deadline}</p>
                            <p className="text-xs text-academic-muted mt-0.5">Upcoming</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2">
                        <svg className="w-5 h-5 mx-auto text-academic-border mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-academic-muted text-xs">No upcoming deadlines</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Status */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Document Status">Document Status</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {stats.documentsUploaded > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-1.5 bg-academic-light rounded-lg">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <div className="p-1 bg-academic-success bg-opacity-10 rounded-lg flex-shrink-0">
                            <svg className="w-3 h-3 text-academic-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-academic-text text-xs font-medium truncate">Latest Document</p>
                            <p className="text-xs text-academic-muted truncate">Uploaded recently</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-academic-success flex-shrink-0">Approved</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-academic-text">{stats.documentsUploaded} document(s) uploaded</p>
                        <p className="text-xs text-academic-muted mt-0.5">Pending review: 0</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-academic-muted text-sm">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Adviser Information */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Adviser Information">Adviser Information</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {adviser ? (
                    <div className="flex items-center space-x-2 p-2 bg-academic-light rounded-lg">
                      <div className="w-8 h-8 bg-academic-primary bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-academic-text text-xs truncate" title={`${adviser.first_name} ${adviser.last_name}`}>{adviser.first_name} {adviser.last_name}</h3>
                        <p className="text-xs text-academic-muted truncate" title={adviser.role}>{adviser.role}</p>
                        <p className="text-xs text-academic-muted truncate" title={adviser.email}>{adviser.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-academic-muted text-xs">No adviser assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - on the right */}
          <div className="card-academic">
            <div className="card-academic-header p-3 mb-3">
              <h2 className="card-academic-title font-semibold truncate" title="Quick Actions">Quick Actions</h2>
            </div>
            <div className="card-academic-body px-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/thesis/submit-topic"
                  className="quick-action-btn schedule p-3 min-h-[4rem]"
                >
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Submit Topic">Submit Topic</span>
                </Link>

                <Link to="/thesis/upload-document" className="quick-action-btn message p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Upload Document">Upload Doc</span>
                </Link>

                <Link to="/dashboard/student/groups" className="quick-action-btn guidelines p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Manage Group">Manage Group</span>
                </Link>

                <Link to="/thesis/feedback" className="quick-action-btn reviews p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="View Feedback">View Feedback</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;