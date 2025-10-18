import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UploadThesisDoc from "./UploadThesisDoc";
import DocumentList from "./DocumentList";
import CollaborativeEditor from "./CollaborativeEditor";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisTopics, fetchThesisDocuments, fetchNotifications as apiFetchNotifications, fetchThesisStatusHistory, fetchStudentGroups } from "../../services/api";
import "../../styles/academic-theme.css";

const ThesisPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshDocuments, setRefreshDocuments] = useState(0);
  const [thesisId, setThesisId] = useState<number | null>(null);
  const [statusHistory, setStatusHistory] = useState<Array<any>>([]);
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [thesisProgress, setThesisProgress] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  // Add state for tracking group membership
  const [studentGroups, setStudentGroups] = useState<Array<any>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Check for documentId parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const documentId = params.get('documentId');
    const urlThesisId = params.get('thesisId');
    
    if (documentId) {
      const docId = parseInt(documentId, 10);
      if (!isNaN(docId)) {
        setActiveDocumentId(docId);
      }
    }
    
    // If thesisId is provided in URL, use it
    if (urlThesisId) {
      const thesisId = parseInt(urlThesisId, 10);
      if (!isNaN(thesisId)) {
        setThesisId(thesisId);
      }
    }
  }, [location]);

  // Add function to check if student is in an active group
  const checkActiveGroupMembership = useCallback(async () => {
    if (!user || user.role.toLowerCase() !== "student") return;
    
    setLoadingGroups(true);
    try {
      const groups = await fetchStudentGroups();
      setStudentGroups(groups);
    } catch (error) {
      console.error("Error fetching student groups:", error);
      setStudentGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  const fetchThesisId = useCallback(async () => {
    if (!user) return;
    try {
      const topics = await fetchThesisTopics();
      console.log("Fetched topics:", topics); // Debug log
      if (Array.isArray(topics) && topics.length > 0 && topics[0].id) {
        const latestThesis = topics[0];
        console.log("Latest thesis:", latestThesis); // Debug log
        setThesisId(latestThesis.id);
        
        // Calculate progress based on thesis status
        let progress = 0;
        switch (latestThesis.status) {
          case "Approved":
            progress = 100;
            break;
          case "Defense Completed":
          case "Final Review":
            progress = 90;
            break;
          case "Writing Phase":
          case "Draft Review":
            progress = 75;
            break;
          case "Research Phase":
            progress = 50;
            break;
          case "Proposal Approved":
            progress = 40;
            break;
          case "Proposal Review":
          case "Proposal Revision":
            progress = 25;
            break;
          case "Topic Approved":
            progress = 15;
            break;
          case "Topic Review":
          case "Topic Rejected":
            progress = 10;
            break;
          case "Topic Submission":
          default:
            progress = 0; // No thesis submitted
            break;
        }
        console.log("Calculated progress:", progress, "for status:", latestThesis.status); // Debug log
        setThesisProgress(progress);
        
        // Fetch document count
        try {
          const docs = await fetchThesisDocuments(latestThesis.id);
          setDocumentCount(Array.isArray(docs) ? docs.length : 0);
        } catch (err) {
          console.error("Error fetching documents:", err);
        }
      } else {
        // No thesis found - set everything to 0
        console.log("No thesis found"); // Debug log
        setThesisId(null);
        setThesisProgress(0);
        setDocumentCount(0);
      }
    } catch (e) {
      // Error fetching - assume no thesis
      console.error("Error fetching thesis:", e); // Debug log
      setThesisId(null);
      setThesisProgress(0);
      setDocumentCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchThesisId();
  }, [fetchThesisId]);

  // Add useEffect to check group membership
  useEffect(() => {
    checkActiveGroupMembership();
  }, [checkActiveGroupMembership]);

  const handleUploadSuccess = () => {
    setRefreshDocuments(prev => prev + 1);
  };

  // handleTopicSubmitted function removed as SubmitTopic component is no longer used

  const handleOpenCollaborativeEditor = (documentId: number) => {
    setActiveDocumentId(documentId);
  };

  const handleBackToDocuments = () => {
    // Check if the user is an adviser
    if (user?.role.toLowerCase() === "adviser") {
      // Navigate back to the adviser thesis view
      navigate("/adviser/thesis");
    } else {
      // For students, just clear the active document and update URL
      setActiveDocumentId(null);
      // Remove documentId from URL
      const params = new URLSearchParams(location.search);
      params.delete('documentId');
      params.delete('thesisId'); // Also remove thesisId
      const newUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  // Add helper function to check if student is in an active group
  const isInActiveGroup = () => {
    if (!user || !studentGroups) {
      return false;
    }
    
    return studentGroups.some((group: any) => 
      group.is_active && group.students.some((student: any) => student.id === user.id)
    );
  };

  useEffect(() => {
    const loadStatusHistory = async () => {
      if (!thesisId) {
        setStatusHistory([]);
        return;
      }
      try {
        const data = await fetchThesisStatusHistory(thesisId);
        setStatusHistory(data || []);
      } catch (e) {
        setStatusHistory([]);
      }
    };
    loadStatusHistory();
  }, [thesisId, refreshDocuments]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await apiFetchNotifications();
        console.log("Loaded notifications:", data); // Debug log
        setNotifications(data || []);
      } catch (e) {
        console.error("Error loading notifications:", e);
        setNotifications([]);
      }
    };
    loadNotifications();
  }, [refreshDocuments]);

  // If we're in collaborative editor mode, render that instead
  if (activeDocumentId && thesisId) {
    return (
      <CollaborativeEditor 
        thesisId={thesisId} 
        documentId={activeDocumentId} 
        onBack={handleBackToDocuments} 
        onDocumentSaved={handleUploadSuccess}
      />
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Header */}
      <div className="dashboard-header-academic sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Thesis Management</h1>
            <p className="text-sm opacity-90 max-w-none">
              Manage your thesis documents, track progress, and collaborate with your adviser.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-light text-academic-text">{thesisProgress}%</div>
                <div className="text-xs text-academic-muted">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-academic-text">{documentCount}</div>
                <div className="text-xs text-academic-muted">Documents</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Show group requirement message for students not in active groups */}
            {user?.role.toLowerCase() === "student" && !isInActiveGroup() && !loadingGroups && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Group Membership Required</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>You must first submit a group proposal and have it approved to create an active group before you can submit thesis documents.</p>
                      <p className="mt-1">Thesis document submission is only available to students who are part of an active group and have completed the group formation process.</p>
                      <div className="mt-3">
                        <a 
                          href="/groups" 
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Go to My Group
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Students can upload - now available to all group members */}
            {user?.role.toLowerCase() === "student" && thesisId && isInActiveGroup() && (
              <div>
                <UploadThesisDoc thesisId={thesisId} onUploadSuccess={handleUploadSuccess} />
              </div>
            )}

            {/* Everyone can view documents */}
            <div>
              <DocumentList 
                thesisId={thesisId || 0} 
                key={refreshDocuments} 
                onOpenCollaborativeEditor={handleOpenCollaborativeEditor}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Progress Card */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Thesis Progress</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-academic-muted">Topic Submission</span>
                    <span className={`text-xs font-medium ${
                      thesisProgress >= 10 ? 'text-academic-success' : 'text-academic-muted'
                    }`}>
                      {thesisProgress >= 10 ? '✓ Complete' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-academic-muted">Proposal</span>
                    <span className={`text-xs font-medium ${
                      thesisProgress >= 25 ? 'text-academic-success' : 
                      thesisProgress >= 10 ? 'text-academic-warning' : 'text-academic-muted'
                    }`}>
                      {thesisProgress >= 25 ? '✓ Complete' : 
                       thesisProgress >= 10 ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-academic-muted">Chapter 1</span>
                    <span className={`text-xs font-medium ${
                      thesisProgress >= 50 ? 'text-academic-success' : 
                      thesisProgress >= 25 ? 'text-academic-warning' : 'text-academic-muted'
                    }`}>
                      {thesisProgress >= 50 ? '✓ Complete' : 
                       thesisProgress >= 25 ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-academic-muted">Final Defense</span>
                    <span className={`text-xs font-medium ${
                      thesisProgress >= 100 ? 'text-academic-success' : 
                      thesisProgress >= 75 ? 'text-academic-warning' : 'text-academic-muted'
                    }`}>
                      {thesisProgress >= 100 ? '✓ Complete' : 
                       thesisProgress >= 75 ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 bg-academic-border rounded-full h-1.5">
                  <div 
                    className="bg-academic-primary h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${thesisProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Quick Actions</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                <div className="space-y-2">
                  <button className="w-full text-left p-3 border border-academic-border rounded-lg hover:border-academic-accent hover:bg-academic-light transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-academic-light rounded-lg">
                        <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-academic-text">Schedule Meeting</span>
                    </div>
                  </button>
                  
                  <button className="w-full text-left p-3 border border-academic-border rounded-lg hover:border-academic-accent hover:bg-academic-light transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-academic-light rounded-lg">
                        <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9 8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-academic-text">Send Message</span>
                    </div>
                  </button>

                  <button className="w-full text-left p-3 border border-academic-border rounded-lg hover:border-academic-accent hover:bg-academic-light transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-academic-light rounded-lg">
                        <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-academic-text">View Guidelines</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Recent Activity</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                {notifications.length === 0 && statusHistory.length === 0 ? (
                  <div className="text-xs text-academic-muted">No recent activity yet.</div>
                ) : (
                  <div className="space-y-3">
                    {/* Show notifications first */}
                    {notifications.slice(0, 3).map((notif: any) => (
                      <div key={notif.id} className="flex items-start space-x-2 pb-3 border-b border-academic-border last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`p-1.5 rounded-lg ${
                            notif.type === 'upload' ? 'bg-academic-light' :
                            notif.type === 'feedback' ? 'bg-academic-light' :
                            notif.type === 'submission' ? 'bg-academic-light' : 'bg-academic-light'
                          }`}>
                            {notif.type === 'upload' && (
                              <svg className="w-3.5 h-3.5 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            )}
                            {notif.type === 'feedback' && (
                              <svg className="w-3.5 h-3.5 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            )}
                            {notif.type === 'submission' && (
                              <svg className="w-3.5 h-3.5 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {!notif.type || !['upload', 'feedback', 'submission'].includes(notif.type) && (
                              <div className="w-1.5 h-1.5 bg-academic-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-academic-text">{notif.message || notif.title || 'System notification'}</p>
                          <p className="text-xs text-academic-muted mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show status history if no notifications or to supplement */}
                    {notifications.length === 0 && statusHistory.map((h: any) => (
                      <div key={h.id} className="flex items-start space-x-2 pb-3 border-b border-academic-border last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="p-1.5 bg-academic-light rounded-lg">
                            <div className="w-1.5 h-1.5 bg-academic-primary rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-academic-text">
                            Status changed: {h.old_status ? `${h.old_status} → ${h.new_status}` : `${h.new_status}`}
                          </p>
                          <p className="text-xs text-academic-muted mt-1">
                            {new Date(h.changed_at).toLocaleString()} {h.changed_by ? `• by ${h.changed_by.username}` : ''}
                          </p>
                          {h.notes && (
                            <p className="text-xs text-academic-muted mt-1">{h.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
export default ThesisPage;