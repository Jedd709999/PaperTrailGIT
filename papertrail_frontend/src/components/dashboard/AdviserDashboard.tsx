import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { fetchStudentGroups, fetchThesisTopics, fetchThesisDocuments, fetchComments } from '../../services/api';
import '../../styles/academic-theme.css';

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
  student: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id?: string;
  };
  documents_count: number;
  group?: {
    id: number;
    name: string;
  };
}

interface StudentGroup {
  id: number;
  name: string;
  students: any[];
  adviser: any;
  created_at: string;
  thesis_title?: string;
}

interface RecentSubmission {
  id: number;
  title: string;
  student_name: string;
  submitted_at: string;
  status: string;
}

interface ThesisDocument {
  id: number;
  doc_type: string;
  version: number;
  uploaded_at: string;
  original_filename: string;
  file_size: number;
  is_latest: boolean;
  thesis: {
    id: number;
    title: string;
    student: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
    };
    group?: {
      id: number;
      name: string;
    };
  };
  comments_count: number;
}

export default function AdviserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ThesisTopic[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<ThesisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    loadDashboardData();
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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [groupsData, thesesData, documentsData] = await Promise.all([
        fetchStudentGroups(),
        fetchThesisTopics(),
        fetchThesisDocuments()
      ]);
      
      // Filter groups where this user is the adviser
      const adviserGroups = groupsData.filter((group: StudentGroup) => 
        group.adviser && group.adviser.id === user?.id
      );
      
      setGroups(adviserGroups);
      
      // Filter theses for this adviser's students
      const adviserTheses = thesesData.filter((thesis: ThesisTopic) => 
        adviserGroups.some((group: StudentGroup) => 
          group.students.some((student: any) => student.id === thesis.student.id)
        )
      );
      
      setTheses(adviserTheses);
      
      // Get recent submissions (last 5)
      const sortedTheses = [...adviserTheses].sort((a, b) => 
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
      
      const recent = sortedTheses.slice(0, 5).map(thesis => ({
        id: thesis.id,
        title: thesis.title,
        student_name: `${thesis.student.first_name} ${thesis.student.last_name}`,
        submitted_at: thesis.submitted_at,
        status: thesis.status
      }));
      
      setRecentSubmissions(recent);
      
      // Get pending reviews
      const pending = adviserTheses.filter(thesis => 
        thesis.status.includes('REVIEW') || thesis.status.includes('SUBMISSION')
      );
      
      setPendingReviews(pending);
      
      // Get recent documents from adviser's theses
      const adviserDocumentIds = adviserTheses.map((thesis: ThesisTopic) => thesis.id);
      const adviserDocuments = documentsData.filter((doc: ThesisDocument) => 
        adviserDocumentIds.includes(doc.thesis.id)
      );
      
      // Sort by upload date and get the 5 most recent
      const sortedDocuments = [...adviserDocuments].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      
      setRecentDocuments(sortedDocuments.slice(0, 5));
      
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUBMISSION':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocTypeDisplay = (docType: string) => {
    const types: { [key: string]: string } = {
      'proposal': 'Thesis Proposal',
      'chapter1': 'Chapter 1 - Introduction',
      'chapter2': 'Chapter 2 - Literature Review',
      'chapter3': 'Chapter 3 - Methodology',
      'chapter4': 'Chapter 4 - Results',
      'chapter5': 'Chapter 5 - Discussion',
      'final': 'Final Manuscript',
      'defense': 'Defense Presentation',
    };
    return types[docType] || docType;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container-academic py-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner-academic mx-auto mb-4"></div>
            <p className="text-academic-text">Loading adviser dashboard...</p>
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
                onClick={loadDashboardData}
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
          Monitor your groups and provide guidance
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="stat-grid-academic gap-3 mb-4 mt-6">
        <div className="stat-card-academic groups p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Assigned Groups">Assigned Groups</p>
          <p className="stat-value-academic text-lg">{groups.length}</p>
        </div>

        <div className="stat-card-academic students p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Total Students">Total Students</p>
          <p className="stat-value-academic text-lg">
            {groups.reduce((total, group) => total + group.students.length, 0)}
          </p>
        </div>

        <div className="stat-card-academic theses p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Active Theses">Active Theses</p>
          <p className="stat-value-academic text-lg">{theses.length}</p>
        </div>

        <div className="stat-card-academic reviews p-3 min-h-[6rem]">
          <div className="stat-card-academic-icon w-10 h-10 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="stat-title-academic text-xs mb-1" title="Pending Reviews">Pending Reviews</p>
          <p className="stat-value-academic text-lg">{pendingReviews.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Main content area with Quick Actions on the right and 2x2 grid on the left */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 2x2 Grid for remaining boxes - on the left */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Groups Overview */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Groups Overview">Groups Overview</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {groups.length > 0 ? (
                    <div className="space-y-3">
                      {groups.map(group => (
                        <div key={group.id} className="border border-academic-border rounded-lg p-3 hover:shadow-academic-shadow transition-shadow duration-300">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-academic-text text-sm">{group.name}</h3>
                              {group.thesis_title && (
                                <p className="text-academic-muted text-xs mt-1 line-clamp-1">
                                  {group.thesis_title}
                                </p>
                              )}
                              <p className="text-academic-muted text-xs mt-1">
                                {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="badge-academic badge-academic-light text-xs">
                              {new Date(group.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {group.students.map((student: any) => (
                              <span key={student.id} className="badge-academic badge-academic-primary text-xs">
                                {student.first_name} {student.last_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <svg className="w-8 h-8 mx-auto text-academic-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-academic-muted text-sm">No groups assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Submissions */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Recent Submissions">Recent Submissions</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {recentSubmissions.length > 0 ? (
                    <div className="space-y-3">
                      {recentSubmissions.map(submission => (
                        <div key={submission.id} className="border border-academic-border rounded-lg p-3 hover:shadow-academic-shadow transition-shadow duration-300">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-academic-text text-sm line-clamp-1">{submission.title}</h3>
                              <p className="text-academic-muted text-xs mt-1">by {submission.student_name}</p>
                            </div>
                            <span className={`badge-academic text-xs ${getStatusClass(submission.status)}`}>
                              {submission.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-academic-muted">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </span>
                            <button 
                              className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                              onClick={() => navigate('/adviser/thesis')}
                            >
                              Review →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <svg className="w-8 h-8 mx-auto text-academic-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-academic-muted text-sm">No recent submissions</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Reviews */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Pending Reviews">Pending Reviews</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {pendingReviews.length > 0 ? (
                    <div className="space-y-3">
                      {pendingReviews.slice(0, 3).map(thesis => (
                        <div key={thesis.id} className="border border-academic-border rounded-lg p-3 hover:shadow-academic-shadow transition-shadow duration-300">
                          <h3 className="font-medium text-academic-text text-sm line-clamp-1">{thesis.title}</h3>
                          <p className="text-academic-muted text-xs mt-1">by {thesis.student.first_name} {thesis.student.last_name}</p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className={`badge-academic text-xs ${getStatusClass(thesis.status)}`}>
                              {thesis.status.replace('_', ' ')}
                            </span>
                            <button 
                              className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                              onClick={() => navigate('/adviser/thesis')}
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingReviews.length > 3 && (
                        <div className="text-center pt-2">
                          <button 
                            className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                            onClick={() => navigate('/adviser/thesis')}
                          >
                            View all {pendingReviews.length} pending reviews →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-academic-muted text-xs">No pending reviews</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Documents */}
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold truncate" title="Recent Documents">Recent Documents</h2>
                </div>
                <div className="card-academic-body px-3 pb-3 max-h-32 overflow-y-auto">
                  {recentDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {recentDocuments.map(doc => (
                        <div key={doc.id} className="border border-academic-border rounded-lg p-3 hover:shadow-academic-shadow transition-shadow duration-300">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-academic-text text-sm line-clamp-1">{getDocTypeDisplay(doc.doc_type)}</h3>
                              <p className="text-academic-muted text-xs mt-1">
                                {doc.thesis.title}
                              </p>
                              <p className="text-academic-muted text-xs mt-1">
                                by {doc.thesis.student.first_name} {doc.thesis.student.last_name}
                              </p>
                            </div>
                            <span className="badge-academic badge-academic-light text-xs">
                              v{doc.version}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-academic-muted">
                              {formatFileSize(doc.file_size)}
                            </span>
                            <div className="flex space-x-2">
                              <button 
                                className="text-academic-primary hover:text-academic-secondary text-xs font-medium"
                                onClick={() => navigate('/adviser/thesis')}
                              >
                                View
                              </button>
                              {doc.comments_count > 0 && (
                                <span className="text-xs text-academic-muted">
                                  {doc.comments_count} comment{doc.comments_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <svg className="w-6 h-6 mx-auto text-academic-border mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-academic-muted text-xs">No recent documents</p>
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
                <button 
                  className="quick-action-btn schedule p-3 min-h-[4rem]"
                  onClick={() => navigate('/adviser/thesis')}
                >
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Review Submission">Review Submission</span>
                </button>

                <button className="quick-action-btn message p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Approve Thesis">Approve Thesis</span>
                </button>

                <button className="quick-action-btn guidelines p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Schedule Defense">Schedule Defense</span>
                </button>

                <button className="quick-action-btn schedule p-3 min-h-[4rem]">
                  <div className="quick-action-icon w-6 h-6 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="quick-action-text text-xs truncate" title="Message Group">Message Group</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}