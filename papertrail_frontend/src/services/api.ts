import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE as string) || "http://127.0.0.1:8000/api"; // Django backend

// Create configured axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh');
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          localStorage.removeItem('role');
          window.location.href = '/';
          return Promise.reject(error);
        }
        
        // Try to refresh the token
        const response = await axios.post(`${API_BASE}/auth/refresh/`, {
          refresh: refreshToken,
        });
        
        const { access } = response.data;
        localStorage.setItem('access', access);
        
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export async function login(username: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || "Login failed");
    }

    const data = await response.json();

    // Return user object with tokens included
    return {
      ...data.user,
      access: data.access,
      refresh: data.refresh
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function fetchProfile() {
  try {
    const token = localStorage.getItem("access");
    if (!token) throw new Error("No token found");

    const response = await fetch(`${API_BASE}/auth/me/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || "Failed to fetch profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch profile error:", error);
    throw error;
  }
}

// Thesis Topic
export const createThesisTopic = async (data: { title: string; description: string; keywords?: string }) => {
  try {
    const res = await api.post('/thesis-topics/', data);
    return res.data;
  } catch (error) {
    console.error("Create thesis topic error:", error);
    throw error;
  }
};

export const fetchThesisTopics = async () => {
  try {
    const res = await api.get('/thesis-topics/');
    return res.data;
  } catch (error) {
    console.error("Fetch thesis topics error:", error);
    throw error;
  }
};

// Upload Thesis Document
export const uploadThesisDocument = async (thesisId: number, file: File, docType: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('thesis_id', thesisId.toString());

    const res = await api.post('/thesis-documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error("Upload thesis document error:", error);
    throw error;
  }
};

// Delete Document
export const deleteThesisDocument = async (docId: number) => {
  try {
    const res = await api.delete(`/thesis-documents/${docId}/`);
    return res.data;
  } catch (error) {
    console.error("Delete thesis document error:", error);
    throw error;
  }
};

// Fetch Documents
export const fetchThesisDocuments = async (thesisId?: number) => {
  try {
    const url = thesisId ? `/thesis-documents/?thesis_id=${thesisId}` : '/thesis-documents/';
    console.log("Fetching documents from URL:", url);
    const res = await api.get(url);
    console.log("Documents response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Fetch thesis documents error:", error);
    throw error;
  }
};

// Download Document
export const downloadDocument = async (docId: number) => {
  try {
    // First get document details to know the original filename
    const docResponse = await api.get(`/thesis-documents/${docId}/`);
    const documentData = docResponse.data;
    
    const res = await api.get(`/thesis-documents/${docId}/download/`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    // Use the original filename from the document
    link.setAttribute('download', documentData.original_filename || `document-${docId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download document error:", error);
    throw error;
  }
};

// Comments
export const fetchComments = async (thesisId?: number, documentId?: number) => {
  try {
    const params = new URLSearchParams();
    if (thesisId) params.append('thesis', thesisId.toString());
    if (documentId) params.append('thesis_document', documentId.toString());
    
    const res = await api.get(`/comments/?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.error("Fetch comments error:", error);
    throw error;
  }
};

export const createComment = async (data: {
  thesis?: number;
  thesis_document?: number;
  text: string;
  comment_type: string;
  page_number?: number;
}) => {
  try {
    const res = await api.post('/comments/', data);
    return res.data;
  } catch (error) {
    console.error("Create comment error:", error);
    throw error;
  }
};

// Add these new functions for collaborative editing
export const updateComment = async (commentId: number, data: { text?: string; is_resolved?: boolean }) => {
  try {
    const res = await api.patch(`/comments/${commentId}/`, data);
    return res.data;
  } catch (error) {
    console.error("Update comment error:", error);
    throw error;
  }
};

export const deleteComment = async (commentId: number) => {
  try {
    const res = await api.delete(`/comments/${commentId}/`);
    return res.data;
  } catch (error) {
    console.error("Delete comment error:", error);
    throw error;
  }
};

export const replyToComment = async (commentId: number, data: { text: string; comment_type: string }) => {
  try {
    const res = await api.post(`/comments/${commentId}/reply/`, data);
    return res.data;
  } catch (error) {
    console.error("Reply to comment error:", error);
    throw error;
  }
};

export const resolveComment = async (commentId: number) => {
  try {
    const res = await api.post(`/comments/${commentId}/resolve/`, {});
    return res.data;
  } catch (error) {
    console.error("Resolve comment error:", error);
    throw error;
  }
};

// Evaluations
export const fetchEvaluations = async (thesisId?: number) => {
  try {
    const url = thesisId ? `/evaluations/?thesis=${thesisId}` : '/evaluations/';
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Fetch evaluations error:", error);
    throw error;
  }
};

export const createEvaluation = async (data: {
  thesis: number;
  criteria: string;
  score: number;
  comments: string;
  is_final?: boolean;
}) => {
  try {
    const res = await api.post('/evaluations/', data);
    return res.data;
  } catch (error) {
    console.error("Create evaluation error:", error);
    throw error;
  }
};

// Notifications
export const fetchNotifications = async () => {
  try {
    const res = await api.get('/notifications/');
    return res.data;
  } catch (error) {
    console.error("Fetch notifications error:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const res = await api.post(`/notifications/${notificationId}/mark_read/`, {});
    return res.data;
  } catch (error) {
    console.error("Mark notification as read error:", error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const res = await api.post('/notifications/mark_all_read/', {});
    return res.data;
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    throw error;
  }
};

// Users
export const fetchUsers = async () => {
  try {
    const res = await api.get('/users/');
    console.log("Raw users response:", res);
    console.log("Users data:", res.data);
    return res.data;
  } catch (error) {
    console.error("Fetch users error:", error);
    throw error;
  }
};

// Student Groups
export const fetchStudentGroups = async () => {
  try {
    const res = await api.get('/student-groups/');
    return res.data;
  } catch (error) {
    console.error("Fetch student groups error:", error);
    throw error;
  }
};

export const createStudentGroup = async (data: { name: string; students: number[] }) => {
  try {
    const res = await api.post('/student-groups/', data);
    return res.data;
  } catch (error) {
    console.error("Create student group error:", error);
    throw error;
  }
};

export const updateStudentGroup = async (groupId: number, data: { name?: string; students?: number[]; adviser?: number; panel_members?: number[] }) => {
  try {
    console.log("Updating student group:", groupId, data); // Debug log
    const res = await api.patch(`/student-groups/${groupId}/`, data);
    console.log("Update response:", res.data); // Debug log
    return res.data;
  } catch (error) {
    console.error("Update student group error:", error);
    throw error;
  }
};

export const deleteStudentGroup = async (groupId: number) => {
  try {
    const res = await api.delete(`/student-groups/${groupId}/`);
    return res.data;
  } catch (error) {
    console.error("Delete student group error:", error);
    throw error;
  }
};

export const assignAdviserToGroup = async (groupId: number, adviserId: number) => {
  try {
    const res = await api.post(`/student-groups/${groupId}/assign_adviser/`, { adviser_id: adviserId });
    return res.data;
  } catch (error) {
    console.error("Assign adviser to group error:", error);
    throw error;
  }
};

export const assignPanelToGroup = async (groupId: number, panelIds: number[]) => {
  try {
    console.log("Using deprecated assignPanelToGroup function:", groupId, panelIds); // Debug log
    const res = await api.post(`/student-groups/${groupId}/assign_panel/`, { panel_ids: panelIds });
    console.log("Panel assignment response:", res.data); // Debug log
    return res.data;
  } catch (error) {
    console.error("Assign panel to group error:", error);
    throw error;
  }
};

// Group Proposals
export const fetchGroupProposals = async () => {
  try {
    const res = await api.get('/group-proposals/');
    console.log("Raw proposals response:", res);
    console.log("Proposals data:", res.data);
    return res.data;
  } catch (error) {
    console.error("Fetch group proposals error:", error);
    throw error;
  }
};

export const createGroupProposal = async (data: { 
  title: string; 
  description?: string;
  students: number[];
  preferred_adviser?: number;
}) => {
  try {
    const res = await api.post('/group-proposals/', data);
    return res.data;
  } catch (error) {
    console.error("Create group proposal error:", error);
    throw error;
  }
};

// Add delete group proposal function
export const deleteGroupProposal = async (proposalId: number) => {
  try {
    const res = await api.delete(`/group-proposals/${proposalId}/`);
    return res.data;
  } catch (error) {
    console.error("Delete group proposal error:", error);
    throw error;
  }
};

// Add function to remove student from proposal
export const removeStudentFromProposal = async (proposalId: number, studentId: number) => {
  try {
    const res = await api.post(`/group-proposals/${proposalId}/remove_student/`, { student_id: studentId });
    return res.data;
  } catch (error) {
    console.error("Remove student from proposal error:", error);
    throw error;
  }
};

export const assignAdviserToProposal = async (proposalId: number, adviserId: number) => {
  try {
    const res = await api.post(`/group-proposals/${proposalId}/assign_adviser/`, { adviser_id: adviserId });
    return res.data;
  } catch (error) {
    console.error("Assign adviser to proposal error:", error);
    throw error;
  }
};

export const adviserAcceptProposal = async (proposalId: number) => {
  try {
    const res = await api.post(`/group-proposals/${proposalId}/adviser_accept/`, {});
    return res.data;
  } catch (error) {
    console.error("Adviser accept proposal error:", error);
    throw error;
  }
};

export const adviserRejectProposal = async (proposalId: number, reason: string) => {
  try {
    const res = await api.post(`/group-proposals/${proposalId}/adviser_reject/`, { reason });
    return res.data;
  } catch (error) {
    console.error("Adviser reject proposal error:", error);
    throw error;
  }
};

// Thesis Status History
export const fetchThesisStatusHistory = async (thesisId: number) => {
  try {
    const res = await api.get(`/thesis-topics/${thesisId}/status_history/`);
    return res.data;
  } catch (error) {
    console.error("Fetch thesis status history error:", error);
    throw error;
  }
};

export const updateThesisStatus = async (thesisId: number, status: string, notes?: string) => {
  try {
    const res = await api.post(`/thesis-topics/${thesisId}/update_status/`, { status, notes });
    return res.data;
  } catch (error) {
    console.error("Update thesis status error:", error);
    throw error;
  }
};

// Admin
export const fetchAdminStats = async () => {
  try {
    const res = await api.get('/admin/stats/');
    return res.data;
  } catch (error) {
    console.error("Fetch admin stats error:", error);
    throw error;
  }
};

// Defense Schedules
export const fetchDefenseSchedules = async () => {
  try {
    const res = await api.get('/defense-schedules/');
    return res.data;
  } catch (error) {
    console.error("Fetch defense schedules error:", error);
    throw error;
  }
};

export const createDefenseSchedule = async (data: {
  thesis: number;
  date: string;
  location: string;
  duration_minutes: number;
  panel_members: number[];
}) => {
  try {
    const res = await api.post('/defense-schedules/', data);
    return res.data;
  } catch (error) {
    console.error("Create defense schedule error:", error);
    throw error;
  }
};

export const checkDefenseScheduleConflicts = async (data: {
  date: string;
  duration_minutes: number;
  panel_member_ids: number[];
}) => {
  try {
    const res = await api.post('/defense-schedules/check_conflicts/', data);
    return res.data;
  } catch (error) {
    console.error("Check defense schedule conflicts error:", error);
    throw error;
  }
};
