import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchAdminStats } from "../../services/api";
import "../../styles/academic-theme.css";

interface AdminStats {
  totalUsers: number;
  totalTheses: number;
  pendingApprovals: number;
  activeDefenses: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err: any) {
        console.error("Failed to load dashboard statistics:", err);
        setError("Failed to load dashboard statistics. Please try again.");
      }
      setLoading(false);
    };

    getStats();
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

  const refreshStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to refresh dashboard statistics:", err);
      setError("Failed to refresh dashboard statistics. Please try again.");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container-academic py-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner-academic mx-auto mb-4"></div>
            <p className="text-academic-text">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-academic py-4">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md max-w-md">
            <div className="flex justify-between items-center">
              <span className="text-sm">{error}</span>
              <button 
                onClick={refreshStats}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Dashboard Header */}
      <div className="dashboard-header-academic sticky top-0 z-40">
        <h1 className="text-3xl font-semibold mb-1">Welcome back, {user?.first_name || user?.username}</h1>
        <p className="text-base opacity-90 max-w-none">
          Manage system, users, and schedules
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="stat-grid-academic gap-3 mb-4 mt-6">
        <div className="stat-card-academic groups p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Total Users">Total Users</p>
          <p className="stat-value-academic text-lg">{stats ? stats.totalUsers : "..."}</p>
        </div>

        <div className="stat-card-academic students p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Total Theses">Total Theses</p>
          <p className="stat-value-academic text-lg">{stats ? stats.totalTheses : "..."}</p>
        </div>

        <div className="stat-card-academic theses p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Pending Approvals">Pending Approvals</p>
          <p className="stat-value-academic text-lg">{stats ? stats.pendingApprovals : "..."}</p>
        </div>

        <div className="stat-card-academic reviews p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Active Defenses">Active Defenses</p>
          <p className="stat-value-academic text-lg">{stats ? stats.activeDefenses : "..."}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Main content area with 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 2x2 Grid for remaining boxes - on the left */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* System Overview */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="System Overview">System Overview</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-academic-light rounded-lg">
                      <div className="text-lg font-bold text-academic-primary mb-1">98%</div>
                      <div className="text-xs font-medium text-academic-text">System Uptime</div>
                    </div>
                    <div className="text-center p-3 bg-academic-light rounded-lg">
                      <div className="text-lg font-bold text-academic-success mb-1">24</div>
                      <div className="text-xs font-medium text-academic-text">Active Sessions</div>
                    </div>
                    <div className="text-center p-3 bg-academic-light rounded-lg">
                      <div className="text-lg font-bold text-academic-accent mb-1">1.2GB</div>
                      <div className="text-xs font-medium text-academic-text">Storage Used</div>
                    </div>
                  </div>
                  
                  {/* Thesis Submission Statistics */}
                  <div className="mt-4">
                    <h3 className="font-medium text-academic-text text-sm mb-2">Thesis Submission Statistics</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-academic-text mb-1">
                          <span>Submitted</span>
                          <span>42</span>
                        </div>
                        <div className="progress-academic">
                          <div 
                            className="progress-academic-bar bg-academic-primary" 
                            style={{ width: '70%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-medium text-academic-text mb-1">
                          <span>Under Review</span>
                          <span>18</span>
                        </div>
                        <div className="progress-academic">
                          <div 
                            className="progress-academic-bar bg-academic-warning" 
                            style={{ width: '30%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-medium text-academic-text mb-1">
                          <span>Approved</span>
                          <span>35</span>
                        </div>
                        <div className="progress-academic">
                          <div 
                            className="progress-academic-bar bg-academic-success" 
                            style={{ width: '58%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-medium text-academic-text mb-1">
                          <span>Rejected</span>
                          <span>7</span>
                        </div>
                        <div className="progress-academic">
                          <div 
                            className="progress-academic-bar bg-academic-danger" 
                            style={{ width: '12%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Defense Schedules Overview */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Defense Schedules Overview">Defense Schedules Overview</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-academic-border rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-academic-primary mb-1">12</div>
                      <div className="text-xs font-medium text-academic-text">Upcoming</div>
                    </div>
                    <div className="border border-academic-border rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-academic-warning mb-1">5</div>
                      <div className="text-xs font-medium text-academic-text">Ongoing</div>
                    </div>
                    <div className="border border-academic-border rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-academic-success mb-1">28</div>
                      <div className="text-xs font-medium text-academic-text">Completed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="User Management">User Management</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/dashboard/admin/users"
                      className="quick-action-btn schedule p-3 min-h-[4rem]"
                    >
                      <div className="quick-action-icon w-6 h-6 mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <span className="quick-action-text text-xs truncate" title="Manage Users">Manage Users</span>
                    </Link>

                    <button className="quick-action-btn message p-3 min-h-[4rem]">
                      <div className="quick-action-icon w-6 h-6 mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="quick-action-text text-xs truncate" title="Assign Adviser">Assign Adviser</span>
                    </button>

                    <button className="quick-action-btn guidelines p-3 min-h-[4rem]">
                      <div className="quick-action-icon w-6 h-6 mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="quick-action-text text-xs truncate" title="Assign Panel">Assign Panel</span>
                    </button>

                    <button className="quick-action-btn schedule p-3 min-h-[4rem]">
                      <div className="quick-action-icon w-6 h-6 mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="quick-action-text text-xs truncate" title="Generate Reports">Generate Reports</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Reports Section */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Reports">Reports</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-2 border border-academic-border rounded-lg hover:border-academic-primary hover:bg-academic-light transition-all duration-200">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-academic-primary bg-opacity-10 rounded-lg mr-2">
                          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-academic-text text-sm">Activity Report</span>
                      </div>
                      <svg className="w-4 h-4 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    <button className="w-full flex items-center justify-between p-2 border border-academic-border rounded-lg hover:border-academic-primary hover:bg-academic-light transition-all duration-200">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-academic-primary bg-opacity-10 rounded-lg mr-2">
                          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-academic-text text-sm">Evaluation Summary</span>
                      </div>
                      <svg className="w-4 h-4 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    <button className="w-full flex items-center justify-between p-2 border border-academic-border rounded-lg hover:border-academic-primary hover:bg-academic-light transition-all duration-200">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-academic-primary bg-opacity-10 rounded-lg mr-2">
                          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-academic-text text-sm">Progress Report</span>
                      </div>
                      <svg className="w-4 h-4 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
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
                  to="/dashboard/admin/users"
                  className="quick-action-btn schedule p-3 min-h-[4rem]"
                >
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Manage Users">Manage Users</span>
                </Link>

                <button className="quick-action-btn message p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Assign Adviser">Assign Adviser</span>
                </button>

                <button className="quick-action-btn guidelines p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Assign Panel">Assign Panel</span>
                </button>

                <Link to="/dashboard/admin/defense" className="quick-action-btn schedule p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Defense Scheduler">Defense Scheduler</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
