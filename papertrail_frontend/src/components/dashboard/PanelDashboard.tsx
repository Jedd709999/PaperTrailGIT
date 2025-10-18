import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisTopics, fetchEvaluations } from "../../services/api";
import "../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  student: User;
  adviser?: User;
  submitted_at: string;
}

interface Evaluation {
  id: number;
  thesis: ThesisTopic;
  criteria: string;
  score: number;
  comments: string;
  submitted_at: string;
  is_final: boolean;
}

interface Review {
  thesis: ThesisTopic;
  evaluations: Evaluation[];
  averageScore?: number;
}

export default function PanelDashboard() {
  const { user } = useAuth();
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    loadReviewsData();
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

  const loadReviewsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [thesesData, evaluationsData] = await Promise.all([
        fetchThesisTopics(),
        fetchEvaluations()
      ]);
      
      setTheses(thesesData);
      setEvaluations(evaluationsData);
      
      // Process reviews
      const processedReviews = thesesData.map(thesis => {
        const thesisEvaluations = evaluationsData.filter(evaluation => evaluation.thesis.id === thesis.id);
        const averageScore = thesisEvaluations.length > 0 
          ? thesisEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / thesisEvaluations.length 
          : undefined;
        
        return {
          thesis,
          evaluations: thesisEvaluations,
          averageScore
        };
      });
      
      setReviews(processedReviews);
      
    } catch (err: any) {
      console.error('Failed to load reviews data:', err);
      const message = err?.response?.data?.detail || err?.message || 'Failed to load reviews data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'defense ready': return 'bg-academic-warning bg-opacity-20 text-academic-warning';
      case 'defense scheduled': return 'bg-academic-primary bg-opacity-20 text-academic-primary';
      case 'defense completed': return 'bg-academic-success bg-opacity-20 text-academic-success';
      case 'approved': return 'bg-academic-success bg-opacity-20 text-academic-success';
      case 'final review': return 'bg-academic-accent bg-opacity-20 text-academic-accent';
      case 'proposal approved': return 'bg-academic-secondary bg-opacity-20 text-academic-secondary';
      default: return 'bg-academic-border bg-opacity-20 text-academic-text';
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'text-academic-success';
    if (score >= 80) return 'text-academic-primary';
    if (score >= 70) return 'text-academic-warning';
    if (score >= 60) return 'text-academic-accent';
    return 'text-academic-danger';
  };

  const getFilteredReviews = () => {
    switch (activeTab) {
      case 'pending':
        return reviews.filter(review => review.evaluations.length === 0);
      case 'completed':
        return reviews.filter(review => review.evaluations.some(evaluation => evaluation.is_final));
      default:
        return reviews;
    }
  };

  if (user?.role.toLowerCase() !== "panel") {
    return (
      <div className="container-academic py-4">
        <div className="flex-1">
          <div className="flex items-center justify-center min-h-screen">
            <div className="card-academic text-center">
              <div className="card-academic-body p-4">
                <h1 className="text-lg font-bold text-academic-text mb-2">Access Denied</h1>
                <p className="text-academic-muted text-sm">You don't have permission to access this page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-academic py-4">
        <div className="flex-1">
          <div className="flex items-center justify-center min-h-screen">
            <div className="card-academic text-center">
              <div className="card-academic-body p-4">
                <div className="spinner-academic mx-auto mb-3"></div>
                <p className="text-academic-muted text-sm">Loading reviews...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-academic py-4">
        <div className="flex-1">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="card-academic text-center border border-academic-danger text-academic-danger max-w-md">
              <div className="card-academic-body p-4">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredReviews = getFilteredReviews();

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Dashboard Header */}
      <div className="dashboard-header-academic sticky top-0 z-40">
        <h1 className="text-3xl font-semibold mb-1">Panel Reviews</h1>
        <p className="text-base opacity-90 max-w-none">
          Evaluate thesis submissions, provide feedback, and manage defense reviews
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
          <p className="stat-title-academic text-xs mb-1" title="Total Theses">Total Theses</p>
          <p className="stat-value-academic text-lg">{theses.length}</p>
        </div>

        <div className="stat-card-academic students p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Pending Reviews">Pending Reviews</p>
          <p className="stat-value-academic text-lg">{reviews.filter(r => r.evaluations.length === 0).length}</p>
        </div>

        <div className="stat-card-academic theses p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Completed Reviews">Completed Reviews</p>
          <p className="stat-value-academic text-lg">{reviews.filter(r => r.evaluations.some(e => e.is_final)).length}</p>
        </div>

        <div className="stat-card-academic reviews p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Average Score">Average Score</p>
          <p className="stat-value-academic text-lg">
            {evaluations.length > 0 
              ? (evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length).toFixed(1)
              : "0.0"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Main content area with Quick Actions on the right and 2x2 grid on the left */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 2x2 Grid for remaining boxes - on the left */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Reviews Grid */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Reviews Overview">Reviews Overview</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-primary bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Total Theses</p>
                          <p className="text-xs text-academic-muted">{theses.length}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-primary">{theses.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-warning bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Pending Reviews</p>
                          <p className="text-xs text-academic-muted">Awaiting evaluation</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-warning">{reviews.filter(r => r.evaluations.length === 0).length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-success bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Completed Reviews</p>
                          <p className="text-xs text-academic-muted">Fully evaluated</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-success">{reviews.filter(r => r.evaluations.some(e => e.is_final)).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation Statistics */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Evaluation Statistics">Evaluation Statistics</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-accent bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Total Evaluations</p>
                          <p className="text-xs text-academic-muted">Submitted reviews</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-accent">{evaluations.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-info bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Average Score</p>
                          <p className="text-xs text-academic-muted">Overall rating</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-info">
                        {evaluations.length > 0 
                          ? (evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length).toFixed(1)
                          : "0.0"}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-academic-secondary bg-opacity-10 rounded-lg">
                          <svg className="w-4 h-4 text-academic-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-academic-text text-xs font-medium">Final Evaluations</p>
                          <p className="text-xs text-academic-muted">Completed reviews</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-academic-secondary">
                        {evaluations.filter(e => e.is_final).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Evaluations */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Recent Evaluations">Recent Evaluations</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {evaluations.length > 0 ? (
                    <div className="space-y-3">
                      {evaluations.slice(0, 3).map(evaluation => (
                        <div key={evaluation.id} className="border border-academic-border rounded-lg p-3 hover:shadow-academic-shadow transition-shadow duration-300">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-academic-text text-sm line-clamp-1">{evaluation.thesis.title}</h3>
                              <p className="text-academic-muted text-xs mt-1">
                                Score: {evaluation.score}/100
                              </p>
                            </div>
                            <span className={`badge-academic text-xs ${evaluation.is_final ? 'bg-academic-success bg-opacity-20 text-academic-success' : 'bg-academic-warning bg-opacity-20 text-academic-warning'}`}>
                              {evaluation.is_final ? 'Final' : 'Draft'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-academic-muted">
                              {new Date(evaluation.submitted_at).toLocaleDateString()}
                            </span>
                            <button 
                              className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                              onClick={() => window.location.href = `/dashboard/panel/reviews`}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                      {evaluations.length > 3 && (
                        <div className="text-center pt-2">
                          <button 
                            className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                            onClick={() => window.location.href = `/dashboard/panel/reviews`}
                          >
                            View all {evaluations.length} evaluations →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-academic-muted text-xs">No evaluations yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thesis Status Distribution */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Thesis Status Distribution">Thesis Status Distribution</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  <div className="space-y-3">
                    {theses.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-academic-primary"></div>
                            <span className="text-academic-text text-xs">Defense Ready</span>
                          </div>
                          <span className="text-xs font-medium text-academic-primary">
                            {theses.filter(t => t.status === 'DEFENSE_READY').length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-academic-warning"></div>
                            <span className="text-academic-text text-xs">Defense Scheduled</span>
                          </div>
                          <span className="text-xs font-medium text-academic-warning">
                            {theses.filter(t => t.status === 'DEFENSE_SCHEDULED').length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-academic-light rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-academic-success"></div>
                            <span className="text-academic-text text-xs">Defense Completed</span>
                          </div>
                          <span className="text-xs font-medium text-academic-success">
                            {theses.filter(t => t.status === 'DEFENSE_COMPLETED').length}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <svg className="w-5 h-5 mx-auto text-academic-border mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-academic-muted text-xs">No thesis data</p>
                      </div>
                    )}
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
                <button className="quick-action-btn schedule p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="View All Theses">View All Theses</span>
                </button>

                <button className="quick-action-btn message p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Pending Reviews">Pending Reviews</span>
                </button>

                <button className="quick-action-btn guidelines p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Completed Reviews">Completed Reviews</span>
                </button>

                <button className="quick-action-btn reviews p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Export Reports">Export Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}