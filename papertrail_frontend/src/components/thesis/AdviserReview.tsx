import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import '../styles/academic-theme.css';

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  keywords: string;
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
  latest_document?: any;
  group?: {
    id: number;
    name: string;
  };
}

interface ThesisDocument {
  id: number;
  doc_type: string;
  original_filename: string;
  file_size: number;
  version: number;
  uploaded_at: string;
  uploaded_by: {
    username: string;
    first_name: string;
    last_name: string;
  };
  comments_count: number;
  file: string;
  thesis?: number;
}

interface Comment {
  id: number;
  text: string;
  comment_type: string;
  created_at: string;
  user: {
    username: string;
    first_name: string;
    last_name: string;
  };
  is_resolved: boolean;
  replies: Comment[];
  thesis?: number;
  thesis_document?: number;
  parent?: number;
}

interface StudentGroup {
  id: number;
  name: string;
  students: User[];
  adviser: User;
  created_at: string;
  theses_count: number;
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id?: string;
  role: string;
}

const AdviserReview: React.FC = () => {
  const { user } = useAuth();
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<ThesisTopic | null>(null);
  const [documents, setDocuments] = useState<ThesisDocument[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'feedback' | 'students'>('overview');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Comment form state
  const [commentForm, setCommentForm] = useState({
    text: '',
    comment_type: 'suggestion',
    thesis_document: null as number | null,
    parent: null as number | null
  });

  // Status update form
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    action: 'review' // 'review', 'approve', 'reject'
  });

  // File upload state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    doc_type: 'feedback' // Default to feedback document type
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log('Checking authentication and role...');
    console.log('Current user from AuthContext:', user);
    console.log('User role:', user?.role);
    console.log('Access token available:', !!localStorage.getItem('access'));
    
    // Check if user is authenticated and has adviser role
    if (!user) {
      console.error('No user found in AuthContext');
      return;
    }
    
    if (user.role !== 'Adviser') {
      console.error('User is not an adviser. Role:', user.role);
      return;
    }
    
    console.log('User authenticated as adviser, fetching dashboard data...');
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (selectedThesis) {
      fetchDocuments();
      fetchComments();
    }
  }, [selectedThesis]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    console.log('Starting fetchDashboardData...');
    console.log('Current user:', user);
    try {
      // Fetch data in parallel but handle errors individually
      await Promise.allSettled([
        fetchStudentGroups(),
        fetchAssignedStudents(),
        fetchTheses()
      ]);
      
      console.log('Dashboard data loaded successfully!');
      console.log('Summary:', {
        groups: studentGroups.length,
        students: assignedStudents.length,
        theses: theses.length
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTheses = async () => {
    try {
      console.log('Making API call to /api/thesis-topics/...');
      const response = await fetch('http://127.0.0.1:8000/api/thesis-topics/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw theses data:', data);
        
        // Get the current assigned students data
        const currentStudents = assignedStudents.length > 0 ? assignedStudents : await getAssignedStudentsData();
        console.log('Current students for filtering:', currentStudents.length);
        
        // Filter theses that belong to this adviser's students
        const adviserTheses = data.filter((thesis: ThesisTopic) => {
          console.log('Checking thesis:', thesis.title, 'Student:', thesis.student);
          return thesis.student && currentStudents.some(student => student.id === thesis.student.id);
        });
        
        console.log('Filtered adviser theses:', adviserTheses);
        setTheses(adviserTheses);
      } else {
        console.error('Failed to fetch theses:', response.statusText);
        setError(`Failed to fetch theses: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching theses:', err);
      setError('Network error occurred while fetching theses');
    }
  };

  // Helper function to get assigned students data directly
  const getAssignedStudentsData = async () => {
    try {
      // Get student groups first
      const groups = await getStudentGroupsData();
      // Then get students from those groups
      const studentsFromGroups = groups.flatMap(group => group.students);
      return studentsFromGroups;
    } catch (err) {
      console.error('Error getting assigned students data:', err);
      return [];
    }
  };

  const fetchStudentGroups = async () => {
    try {
      const token = localStorage.getItem('access');
      console.log('Making API call to /api/student-groups/...');
      console.log('Token available:', Boolean(token));
      console.log('Current user ID for filtering:', user?.id);
      
      const response = await fetch('http://127.0.0.1:8000/api/student-groups/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw student groups data:', data);
        console.log('Total groups received:', data.length);
        
        // Filter groups where this user is the adviser
        const adviserGroups = data.filter((group: StudentGroup) => {
          console.log('Checking group:', group.name, 'Adviser:', group.adviser);
          return group.adviser && group.adviser.id === user?.id;
        });
        
        console.log('Filtered adviser groups:', adviserGroups);
        console.log('Total adviser groups:', adviserGroups.length);
        setStudentGroups(adviserGroups);
      } else {
        console.error('Failed to fetch student groups:', response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError(`Failed to fetch student groups: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching student groups:', err);
      setError('Network error occurred while fetching student groups');
    }
  };

  const fetchAssignedStudents = async () => {
    try {
      console.log('Making API call to /api/users/...');
      const response = await fetch('http://127.0.0.1:8000/api/users/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw users data:', data);
        
        // Filter for students in this adviser's groups
        const studentsInGroups = data.filter((user: any) => {
          const isInGroup = user.role === 'Student' && 
            studentGroups.some(group => 
              group.students?.some((student: any) => student.id === user.id)
            );
          console.log('Checking user:', user.username, 'Is in group:', isInGroup);
          return isInGroup;
        });
        
        console.log('Filtered students:', studentsInGroups);
        setAssignedStudents(studentsInGroups);
      } else {
        console.error('Failed to fetch assigned students:', response.statusText);
        setError(`Failed to fetch assigned students: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching assigned students:', err);
      setError('Network error occurred while fetching assigned students');
    }
  };

  // Helper function to get student groups data directly
  const getStudentGroupsData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/student-groups/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter groups where this user is the adviser
        const adviserGroups = data.filter((group: StudentGroup) => 
          group.adviser && group.adviser.id === user?.id
        );
        return adviserGroups;
      }
      return [];
    } catch (err) {
      console.error('Error getting student groups data:', err);
      return [];
    }
  };

  const fetchDocuments = async () => {
    if (!selectedThesis) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/thesis-documents/?thesis=${selectedThesis.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        setError(`Failed to fetch documents: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Network error occurred while fetching documents');
    }
  };

  const fetchComments = async () => {
    if (!selectedThesis) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/comments/?thesis=${selectedThesis.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        setError(`Failed to fetch comments: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Network error occurred while fetching comments');
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThesis) return;

    setLoading(true);
    try {
      let newStatus = statusForm.status;
      
      // Auto-set status based on action
      if (statusForm.action === 'approve') {
        if (selectedThesis.status === 'TOPIC_SUBMISSION') {
          newStatus = 'TOPIC_APPROVED';
        } else if (selectedThesis.status === 'PROPOSAL_WRITING') {
          newStatus = 'PROPOSAL_APPROVED';
        }
      } else if (statusForm.action === 'reject') {
        if (selectedThesis.status === 'TOPIC_SUBMISSION') {
          newStatus = 'TOPIC_REJECTED';
        } else if (selectedThesis.status === 'PROPOSAL_WRITING') {
          newStatus = 'PROPOSAL_REVISION';
        }
      }

      const payload = {
        status: newStatus,
        notes: statusForm.notes
      };

      const response = await fetch(`http://127.0.0.1:8000/api/thesis-topics/${selectedThesis.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`Thesis ${statusForm.action}d successfully!`);
        fetchTheses();
        setStatusForm({ status: '', notes: '', action: 'review' });
        
        // Create notification for student
        await createNotification(
          selectedThesis.student.id,
          `Thesis ${statusForm.action}d`,
          `Your thesis "${selectedThesis.title}" has been ${statusForm.action}d by your adviser. ${statusForm.notes ? `Notes: ${statusForm.notes}` : ''}`,
          'thesis_status'
        );
      } else {
        alert('Failed to update status');
        setError('Failed to update thesis status');
      }
    } catch (err) {
      alert('Network error occurred');
      setError('Network error occurred while updating thesis status');
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (userId: number, title: string, message: string, type: string) => {
    try {
      await fetch('http://127.0.0.1:8000/api/notifications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify({
          user: userId,
          notification_type: type,
          title: title,
          message: message,
          thesis: selectedThesis?.id
        }),
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThesis) return;

    setLoading(true);
    try {
      const payload = {
        text: commentForm.text,
        comment_type: commentForm.comment_type,
        thesis: selectedThesis.id,
        thesis_document: commentForm.thesis_document || undefined,
        parent: commentForm.parent || undefined
      };

      const response = await fetch('http://127.0.0.1:8000/api/comments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Comment added successfully!');
        setCommentForm({ text: '', comment_type: 'suggestion', thesis_document: null, parent: null });
        setReplyingTo(null);
        fetchComments();
        
        // Create notification for student
        await createNotification(
          selectedThesis.student.id,
          'New Comment Received',
          `Your adviser has added a comment on your thesis "${selectedThesis.title}"`,
          'comment'
        );
      } else {
        alert('Failed to add comment');
        setError('Failed to add comment');
      }
    } catch (err) {
      alert('Network error occurred');
      setError('Network error occurred while adding comment');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (commentId: number) => {
    setReplyingTo(commentId);
    setCommentForm({
      ...commentForm,
      parent: commentId,
      text: '',
      comment_type: 'general'
    });
  };

  const resolveComment = async (commentId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/comments/${commentId}/resolve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });

      if (response.ok) {
        fetchComments();
      } else {
        setError(`Failed to resolve comment: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error resolving comment:', err);
      setError('Network error occurred while resolving comment');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'TOPIC_APPROVED':
      case 'PROPOSAL_APPROVED':
      case 'APPROVED':
        return 'status-academic-success';
      case 'TOPIC_REJECTED':
      case 'REJECTED':
        return 'status-academic-danger';
      case 'TOPIC_REVIEW':
      case 'PROPOSAL_REVIEW':
      case 'DRAFT_REVIEW':
      case 'FINAL_REVIEW':
        return 'status-academic-info';
      case 'PROPOSAL_REVISION':
        return 'status-academic-warning';
      case 'TOPIC_SUBMISSION':
      case 'PROPOSAL_WRITING':
      case 'RESEARCH_PHASE':
      case 'WRITING_PHASE':
        return 'status-academic-muted';
      default: return 'status-academic-muted';
    }
  };

  // Helper functions
  const getCommentTypeClass = (type: string): string => {
    switch (type) {
      case 'suggestion':
        return 'status-academic-info';
      case 'correction':
        return 'status-academic-danger';
      case 'approval':
        return 'status-academic-success';
      case 'question':
        return 'status-academic-warning';
      case 'general':
        return 'status-academic-secondary';
      default:
        return 'status-academic-secondary';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThesis || !uploadForm.file) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('doc_type', uploadForm.doc_type);
      formData.append('thesis_id', selectedThesis.id.toString());

      const response = await fetch('http://127.0.0.1:8000/api/thesis-documents/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: formData,
      });

      if (response.ok) {
        alert('Feedback document uploaded successfully!');
        setUploadForm({ file: null, doc_type: 'feedback' });
        fetchDocuments(); // Refresh documents list
        
        // Create notification for student
        await createNotification(
          selectedThesis.student.id,
          'New Feedback Document',
          `Your adviser has uploaded a feedback document for your thesis "${selectedThesis.title}"`,
          'thesis_status'
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to upload document: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Network error occurred while uploading document');
    } finally {
      setUploading(false);
    }
  };

  // Add this function to handle specific status updates
  const handleSpecificStatusUpdate = async (newStatus: string, statusLabel: string) => {
    if (!selectedThesis) return;

    setLoading(true);
    try {
      const payload = {
        status: newStatus,
        notes: statusForm.notes
      };

      const response = await fetch(`http://127.0.0.1:8000/api/thesis-topics/${selectedThesis.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`Thesis status updated to "${statusLabel}" successfully!`);
        fetchTheses();
        setStatusForm({ status: '', notes: '', action: 'review' });
        
        // Create notification for student
        await createNotification(
          selectedThesis.student.id,
          `Thesis Status Updated`,
          `Your thesis "${selectedThesis.title}" status has been updated to "${statusLabel}" by your adviser. ${statusForm.notes ? `Notes: ${statusForm.notes}` : ''}`,
          'thesis_status'
        );
      } else {
        alert('Failed to update status');
        setError('Failed to update thesis status');
      }
    } catch (err) {
      alert('Network error occurred');
      setError('Network error occurred while updating thesis status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Authentication Check */}
      {!user && (
        <div className="card-academic">
          <div className="card-academic-body p-8 text-center">
            <div className="text-academic-danger mb-4 font-bold">Authentication Required</div>
            <p className="text-academic-muted mb-4">You need to be logged in to access the Adviser Dashboard.</p>
            <p className="text-sm text-academic-muted">Please log in with your adviser account to continue.</p>
            <div className="mt-4 p-2 bg-academic-light rounded text-xs text-academic-muted">
              Debug: user = {String(user)}, localStorage access = {Boolean(localStorage.getItem('access'))}
            </div>
          </div>
        </div>
      )}
      
      {user && user.role !== 'Adviser' && (
        <div className="card-academic">
          <div className="card-academic-body p-8 text-center">
            <div className="text-academic-danger mb-4 font-bold">Access Denied</div>
            <p className="text-academic-muted mb-4">You don't have permission to access the Adviser Dashboard.</p>
            <p className="text-sm text-academic-muted">Current role: {user.role}. Required role: Adviser.</p>
          </div>
        </div>
      )}
      
      {user && user.role === 'Adviser' && (
        <>
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button 
                  onClick={fetchDashboardData}
                  className="btn-academic"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold mb-1">Adviser Dashboard</h1>
                <p className="text-sm opacity-90 max-w-none">Manage your assigned students and thesis reviews</p>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="btn-academic py-1.5 px-3 text-sm"
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="stat-grid-academic gap-3 mb-4 mt-6">
            <div className="stat-card-academic groups p-3 min-h-[6rem]">
              <div className="stat-card-academic-icon w-10 h-10 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="stat-title-academic text-xs mb-1">Assigned Groups</p>
              <p className="stat-value-academic text-lg">{studentGroups.length}</p>
            </div>
            <div className="stat-card-academic students p-3 min-h-[6rem]">
              <div className="stat-card-academic-icon w-10 h-10 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="stat-title-academic text-xs mb-1">Total Students</p>
              <p className="stat-value-academic text-lg">{assignedStudents.length}</p>
            </div>
            <div className="stat-card-academic theses p-3 min-h-[6rem]">
              <div className="stat-card-academic-icon w-10 h-10 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="stat-title-academic text-xs mb-1">Active Theses</p>
              <p className="stat-value-academic text-lg">{theses.length}</p>
            </div>
            <div className="stat-card-academic reviews p-3 min-h-[6rem]">
              <div className="stat-card-academic-icon w-10 h-10 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="stat-title-academic text-xs mb-1">Pending Reviews</p>
              <p className="stat-value-academic text-lg">
                {theses.filter(t => t.status === 'TOPIC_SUBMISSION' || t.status === 'PROPOSAL_WRITING').length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left Sidebar - Thesis List */}
            <div className="lg:col-span-1">
              <div className="card-academic">
                <div className="card-academic-header p-3 mb-3">
                  <h2 className="card-academic-title font-semibold">Assigned Theses</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-center text-academic-muted">
                      <div className="spinner-academic mx-auto mb-2"></div>
                      Loading assigned theses...
                    </div>
                  ) : theses.length === 0 ? (
                    <div className="p-6 text-center text-academic-muted">
                      <div className="text-lg font-medium mb-2 text-academic-text">No assigned theses found</div>
                      <div className="text-sm space-y-1">
                        <p>Groups: {studentGroups.length}</p>
                        <p>Students: {assignedStudents.length}</p>
                        <p>User: {user?.username} ({user?.role})</p>
                        <p className="text-academic-danger mt-2">Check console for debugging information</p>
                      </div>
                    </div>
                  ) : (
                    theses.map((thesis) => (
                      <div
                        key={thesis.id}
                        onClick={() => setSelectedThesis(thesis)}
                        className={`p-4 border-b border-academic-border cursor-pointer hover:bg-academic-light ${
                          selectedThesis?.id === thesis.id ? 'bg-academic-light border-l-4 border-l-academic-primary' : ''
                        }`}
                      >
                        <h3 className="font-medium text-academic-text truncate">{thesis.title}</h3>
                        <p className="text-sm text-academic-muted mt-1">
                          {thesis.student.first_name} {thesis.student.last_name}
                          {thesis.student.student_id && ` (${thesis.student.student_id})`}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`status-academic ${getStatusClass(thesis.status)}`}>
                            {thesis.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-academic-muted">
                            {thesis.documents_count} docs
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {selectedThesis ? (
                <div className="card-academic">
                  <div className="card-academic-header p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="card-academic-title text-lg">{selectedThesis.title}</h1>
                        <p className="text-sm text-academic-muted mt-1">
                          Student: {selectedThesis.student.first_name} {selectedThesis.student.last_name} 
                          ({selectedThesis.student.email})
                          {selectedThesis.student.student_id && ` • ID: ${selectedThesis.student.student_id}`}
                        </p>
                      </div>
                      <div>
                        <span className={`status-academic ${getStatusClass(selectedThesis.status)}`}>
                          {selectedThesis.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="card-academic-body px-3 pb-3">
                    <div className="border-b border-academic-border">
                      <nav className="flex space-x-8 px-6">
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'overview'
                              ? 'border-academic-primary text-academic-text'
                              : 'border-transparent text-academic-muted hover:text-academic-text'
                          }`}
                        >
                          Overview
                        </button>
                        <button
                          onClick={() => setActiveTab('documents')}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'documents'
                              ? 'border-academic-primary text-academic-text'
                              : 'border-transparent text-academic-muted hover:text-academic-text'
                          }`}
                        >
                          Documents
                        </button>
                        <button
                          onClick={() => setActiveTab('feedback')}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'feedback'
                              ? 'border-academic-primary text-academic-text'
                              : 'border-transparent text-academic-muted hover:text-academic-text'
                          }`}
                        >
                          Feedback
                        </button>
                        <button
                          onClick={() => setActiveTab('students')}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'students'
                              ? 'border-academic-primary text-academic-text'
                              : 'border-transparent text-academic-muted hover:text-academic-text'
                          }`}
                        >
                          Students
                        </button>
                      </nav>
                    </div>
                    <div className="p-6">
                      {activeTab === 'overview' && (
                        <div>
                          <h3 className="text-lg font-medium text-academic-text mb-4">Thesis Overview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-academic-text">Description</h4>
                              <p className="text-sm text-academic-muted mt-1">{selectedThesis.description || 'No description provided'}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-academic-text">Status</h4>
                              <p className="text-sm text-academic-muted mt-1">{selectedThesis.status.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <h4 className="font-medium text-academic-text">Keywords</h4>
                            <p className="text-sm text-academic-muted mt-1">{selectedThesis.keywords || 'No keywords provided'}</p>
                          </div>
                          <div className="mt-4">
                            <h4 className="font-medium text-academic-text">Submitted At</h4>
                            <p className="text-sm text-academic-muted mt-1">{new Date(selectedThesis.submitted_at).toLocaleDateString()}</p>
                          </div>
                          
                          {/* Status Update Controls */}
                          <div className="mt-6 p-4 border border-academic-border rounded-lg bg-academic-light">
                            <h4 className="font-medium text-academic-text mb-3">Update Thesis Status</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <button
                                onClick={() => handleSpecificStatusUpdate('PROPOSAL_REVISION', 'For Revision')}
                                className="btn-academic bg-academic-warning hover:bg-academic-warning-dark"
                              >
                                Mark for Revision
                              </button>
                              <button
                                onClick={() => handleSpecificStatusUpdate('APPROVED', 'Approved for Panel Review')}
                                className="btn-academic bg-academic-success hover:bg-academic-success-dark"
                              >
                                Approve for Panel Review
                              </button>
                            </div>
                            
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-academic-text mb-1">
                                Additional Notes (Optional)
                              </label>
                              <textarea
                                value={statusForm.notes}
                                onChange={(e) => setStatusForm({...statusForm, notes: e.target.value})}
                                placeholder="Add any additional notes for the student..."
                                className="w-full p-2 border border-academic-border rounded-lg focus:ring-academic-primary focus:border-academic-primary bg-academic-white text-academic-text"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === 'documents' && (
                        <div>
                          <h3 className="text-lg font-medium text-academic-text mb-4">Documents</h3>
                          
                          {/* File Upload Form for Adviser Feedback */}
                          <div className="mb-6 p-4 border border-academic-border rounded-lg bg-academic-light">
                            <h4 className="font-medium text-academic-text mb-3">Upload Feedback Document</h4>
                            <form onSubmit={handleFileUpload} className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-academic-text mb-1">
                                  Document Type
                                </label>
                                <select
                                  value={uploadForm.doc_type}
                                  onChange={(e) => setUploadForm({ ...uploadForm, doc_type: e.target.value })}
                                  className="w-full p-2 border border-academic-border rounded-lg focus:ring-academic-primary focus:border-academic-primary bg-academic-white text-academic-text"
                                >
                                  <option value="feedback">Feedback Document</option>
                                  <option value="annotated">Annotated Version</option>
                                  <option value="revision">Revision Guidelines</option>
                                  <option value="approval">Approval Document</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-academic-text mb-1">
                                  Select File
                                </label>
                                <div className="border-2 border-dashed border-academic-border rounded-lg p-4 text-center hover:border-academic-primary transition-colors">
                                  <input
                                    type="file"
                                    id="feedback-file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                    className="hidden"
                                  />
                                  <label htmlFor="feedback-file" className="cursor-pointer">
                                    <div className="text-center">
                                      <svg className="mx-auto h-8 w-8 text-academic-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      <div className="mt-2">
                                        <p className="text-sm text-academic-text">
                                          <span className="font-medium text-academic-primary">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-academic-muted mt-1">
                                          PDF, DOC, DOCX (Max 10MB)
                                        </p>
                                        {uploadForm.file && (
                                          <p className="text-xs text-academic-primary mt-1">
                                            {uploadForm.file.name}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              </div>
                              
                              <button
                                type="submit"
                                disabled={uploading || !uploadForm.file}
                                className="btn-academic w-full"
                              >
                                {uploading ? 'Uploading...' : 'Upload Feedback Document'}
                              </button>
                            </form>
                          </div>
                          
                          {documents.length > 0 ? (
                            <div className="space-y-4">
                              {documents.map((doc) => (
                                <div key={doc.id} className="border border-academic-border rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium text-academic-text">{doc.original_filename}</h4>
                                      <p className="text-sm text-academic-muted">
                                        {doc.doc_type} • {formatFileSize(doc.file_size)} • Uploaded by {doc.uploaded_by.first_name} {doc.uploaded_by.last_name} on{' '}
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => window.open(`http://127.0.0.1:8000${doc.file}`)}
                                        className="btn-academic"
                                      >
                                        View Document
                                      </button>
                                      <button
                                        onClick={() => {
                                          setCommentForm({
                                            ...commentForm,
                                            thesis_document: doc.id,
                                            text: '',
                                            comment_type: 'suggestion'
                                          });
                                          setActiveTab('feedback');
                                        }}
                                        className="btn-academic"
                                      >
                                        Add Comment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-academic-muted">No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                      {activeTab === 'feedback' && (
                        <div>
                          <h3 className="text-lg font-medium text-academic-text mb-4">Feedback & Comments</h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-academic-text mb-2">Add Comment</h4>
                              <form onSubmit={handleCommentSubmit}>
                                <textarea
                                  value={commentForm.text}
                                  onChange={(e) => setCommentForm({...commentForm, text: e.target.value})}
                                  placeholder="Enter your feedback..."
                                  className="w-full p-3 border border-academic-border rounded-lg focus:ring-academic-primary focus:border-academic-primary bg-academic-white text-academic-text"
                                  rows={4}
                                />
                                <div className="mt-2 flex items-center space-x-4">
                                  <select
                                    value={commentForm.comment_type}
                                    onChange={(e) => setCommentForm({...commentForm, comment_type: e.target.value})}
                                    className="p-2 border border-academic-border rounded-lg focus:ring-academic-primary focus:border-academic-primary bg-academic-white text-academic-text"
                                  >
                                    <option value="suggestion">Suggestion</option>
                                    <option value="correction">Correction</option>
                                    <option value="approval">Approval</option>
                                    <option value="question">Question</option>
                                    <option value="general">General</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="btn-academic"
                                  >
                                    Add Comment
                                  </button>
                                </div>
                              </form>
                            </div>
                            <div>
                              <h4 className="font-medium text-academic-text mb-2">Previous Comments</h4>
                              {comments.length > 0 ? (
                                <div className="space-y-3">
                                  {comments.map((comment) => (
                                    <div key={comment.id} className="border border-academic-border rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-academic-text">{comment.user.first_name} {comment.user.last_name}</span>
                                        <span className={`status-academic ${getCommentTypeClass(comment.comment_type)}`}>
                                          {comment.comment_type}
                                        </span>
                                      </div>
                                      <p className="text-sm text-academic-muted">{comment.text}</p>
                                      <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-academic-muted">{new Date(comment.created_at).toLocaleDateString()}</p>
                                        <div className="flex space-x-2">
                                          {!comment.is_resolved && (
                                            <button
                                              onClick={() => handleReply(comment.id)}
                                              className="text-xs text-academic-primary hover:text-academic-secondary"
                                            >
                                              Reply
                                            </button>
                                          )}
                                          {!comment.is_resolved && (
                                            <button
                                              onClick={() => resolveComment(comment.id)}
                                              className="text-xs text-academic-primary hover:text-academic-secondary"
                                            >
                                              Resolve
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {replyingTo === comment.id && (
                                        <div className="mt-3 p-3 bg-academic-light rounded-lg">
                                          <textarea
                                            value={commentForm.text}
                                            onChange={(e) => setCommentForm({...commentForm, text: e.target.value})}
                                            placeholder="Write a reply..."
                                            className="w-full p-2 border border-academic-border rounded-lg focus:ring-academic-primary focus:border-academic-primary bg-academic-white text-academic-text"
                                            rows={3}
                                          />
                                          <div className="mt-2 flex space-x-2">
                                            <button
                                              onClick={handleCommentSubmit}
                                              className="btn-academic"
                                            >
                                              Submit Reply
                                            </button>
                                            <button
                                              onClick={() => {
                                                setReplyingTo(null);
                                                setCommentForm({...commentForm, text: '', parent: null});
                                              }}
                                              className="btn-academic"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {comment.replies && comment.replies.length > 0 && (
                                        <div className="mt-3 ml-4 space-y-2">
                                          {comment.replies.map((reply) => (
                                            <div key={reply.id} className="border-l-2 border-academic-border pl-3 py-2">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-academic-text text-sm">{reply.user.first_name} {reply.user.last_name}</span>
                                                <span className={`status-academic ${getCommentTypeClass(reply.comment_type)} text-xs`}>
                                                  {reply.comment_type}
                                                </span>
                                              </div>
                                              <p className="text-sm text-academic-muted">{reply.text}</p>
                                              <p className="text-xs text-academic-muted mt-1">{new Date(reply.created_at).toLocaleDateString()}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-academic-muted">No comments yet</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === 'students' && (
                        <div>
                          <h3 className="text-lg font-medium text-academic-text mb-4">Student Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-academic-text">Student Details</h4>
                              <p className="text-sm text-academic-muted mt-1">
                                <strong>Name:</strong> {selectedThesis.student.first_name} {selectedThesis.student.last_name}
                              </p>
                              <p className="text-sm text-academic-muted mt-1">
                                <strong>Email:</strong> {selectedThesis.student.email}
                              </p>
                              {selectedThesis.student.student_id && (
                                <p className="text-sm text-academic-muted mt-1">
                                  <strong>Student ID:</strong> {selectedThesis.student.student_id}
                                </p>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-academic-text">Group Information</h4>
                              <p className="text-sm text-academic-muted mt-1">
                                <strong>Group:</strong> {selectedThesis.group?.name || 'No group assigned'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card-academic">
                  <div className="p-8 text-center">
                    <div className="text-academic-muted mb-4">Select a thesis to review</div>
                    <p className="text-sm text-academic-muted">
                      Choose a thesis from the list on the left to view details, documents,
                      and provide feedback.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdviserReview;