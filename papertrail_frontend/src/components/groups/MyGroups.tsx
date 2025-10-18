﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchStudentGroups, updateThesisStatus, fetchGroupProposals, fetchUsers, createGroupProposal, deleteGroupProposal, removeStudentFromProposal, adviserAcceptProposal, adviserRejectProposal } from "../../services/api";
import "../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  student_id?: string;
  department?: string;
}

interface StudentGroup {
  id: number;
  name: string;
  students: User[];
  adviser?: User;
  panel_members: User[];
  created_by?: User;
  created_at: string;
  is_active: boolean;
}

// Add GroupProposal interface
interface GroupProposal {
  id: number;
  title: string;
  description: string;
  students: User[];
  preferred_adviser?: User | null;
  assigned_adviser?: User | null;
  created_by: User;
  created_at: string;
  status: string;
  student_group?: StudentGroup;
}

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  student: User;
  group?: StudentGroup;
  submitted_at: string;
  approved_at?: string;
}

interface ThesisProgress {
  overall_progress: number;
  steps: {
    name: string;
    status: string;
  }[];
}

interface RecentActivity {
  id: number;
  action: string;
  date: string;
  type: "upload" | "feedback" | "submission";
}

export default function MyGroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [proposals, setProposals] = useState<GroupProposal[]>([]);
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [groupTheses, setGroupTheses] = useState<{[groupId: number]: ThesisTopic[]}>({});
  const [groupProgress, setGroupProgress] = useState<{[groupId: number]: ThesisProgress}>({});
  const [groupActivities, setGroupActivities] = useState<{[groupId: number]: RecentActivity[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add states for the proposal modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  // Add state for the "already in group" modal
  const [showAlreadyInGroupModal, setShowAlreadyInGroupModal] = useState(false);
  // Add state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<number | null>(null);
  // Add state for leave confirmation modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [proposalToLeave, setProposalToLeave] = useState<number | null>(null);
  // Add states for adviser rejection
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [proposalToReject, setProposalToReject] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingProposal, setRejectingProposal] = useState(false);
  // Add state for adviser acceptance
  const [acceptingProposal, setAcceptingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: ""
  });
  const [selectedStudents, setSelectedStudents] = useState<number[]>([user?.id || 0]);
  const [selectedAdviser, setSelectedAdviser] = useState<number | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);

  const isAdviser = user?.role.toLowerCase() === "adviser";
  const isStudent = user?.role.toLowerCase() === "student";

  useEffect(() => {
    loadGroupsAndProposals();
  }, []);

  // Update function name and functionality
  const loadGroupsAndProposals = async () => {
    try {
      setError(null);
      
      // Fetch student groups
      const groupsData = await fetchStudentGroups();
      console.log("Raw groups data from API:", groupsData);
      
      // Ensure all required properties exist and are properly formatted for each group
      const processedGroupsData = groupsData.map((group: any) => {
        // Process panel members to ensure they have the required properties
        const processedPanelMembers = Array.isArray(group.panel_members) 
          ? group.panel_members.map((panel: any) => ({
              id: panel.id || 0,
              first_name: panel.first_name || '',
              last_name: panel.last_name || '',
              username: panel.username || '',
              role: panel.role || 'Panel'
            }))
          : [];
          
        return {
          ...group,
          students: Array.isArray(group.students) ? group.students : [],
          panel_members: processedPanelMembers,
          adviser: group.adviser || null,
          created_by: group.created_by || null
        };
      });
      
      console.log("Processed groups data:", processedGroupsData);
      setGroups(processedGroupsData);
      
      // Fetch group proposals for students and advisers
      if (user?.role.toLowerCase() === 'student' || user?.role.toLowerCase() === 'adviser') {
        const proposalsData = await fetchGroupProposals();
        console.log("Raw proposals data:", proposalsData);
        
        // Validate and transform proposals data
        const validatedProposals = Array.isArray(proposalsData) 
          ? proposalsData.map(proposal => ({
              ...proposal,
              students: Array.isArray(proposal.students) ? proposal.students : [],
              preferred_adviser: proposal.preferred_adviser || null,
              assigned_adviser: proposal.assigned_adviser || null,
              created_by: proposal.created_by || { id: 0, username: "Unknown", first_name: "", last_name: "", role: "", email: "" }
            }))
          : [];
        
        setProposals(validatedProposals);
      }
      
      // Fetch theses and activities for each group
      for (const group of processedGroupsData) {
        await fetchGroupTheses(group.id);
        await fetchGroupActivities(group.id);
      }
    } catch (err: any) {
      console.error("Failed to load groups:", err?.response?.data || err?.message || err);
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to load groups. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupTheses = async (groupId: number) => {
    try {
      const token = localStorage.getItem("access");
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch thesis topics for the group
      const thesisResponse = await fetch(`http://127.0.0.1:8000/api/thesis-topics/?group=${groupId}`, { headers });
      if (thesisResponse.ok) {
        const thesisData = await thesisResponse.json();
        setGroupTheses(prev => ({
          ...prev,
          [groupId]: Array.isArray(thesisData) ? thesisData : []
        }));

        // Calculate progress for each thesis in the group
        if (Array.isArray(thesisData) && thesisData.length > 0) {
          const progress = calculateThesisProgress(thesisData[0]);
          setGroupProgress(prev => ({
            ...prev,
            [groupId]: progress
          }));
        }
      } else {
        console.error(`Failed to fetch theses for group ${groupId}:`, thesisResponse.status, thesisResponse.statusText);
      }
    } catch (err) {
      console.error(`Error fetching theses for group ${groupId}:`, err);
    }
  };

  const fetchGroupActivities = async (groupId: number) => {
    try {
      const token = localStorage.getItem("access");
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch notifications for recent activity
      const notificationsResponse = await fetch("http://127.0.0.1:8000/api/notifications/", { headers });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const activities = Array.isArray(notificationsData) 
          ? notificationsData.slice(0, 5).map((notif, index) => ({
              id: notif.id || index + 1,
              action: notif.message || "System notification",
              date: new Date(notif.created_at).toLocaleDateString(),
              type: notif.type || "submission",
            }))
          : [];
        setGroupActivities(prev => ({
          ...prev,
          [groupId]: activities
        }));
      } else {
        console.error(`Failed to fetch activities for group ${groupId}:`, notificationsResponse.status, notificationsResponse.statusText);
      }
    } catch (err) {
      console.error(`Error fetching activities for group ${groupId}:`, err);
    }
  };

  const calculateThesisProgress = (thesis: ThesisTopic): ThesisProgress => {
    let steps = [
      { name: "Topic Submission", status: "pending" },
      { name: "Proposal", status: "pending" },
      { name: "Chapter 1", status: "pending" },
      { name: "Final Defense", status: "pending" },
    ];
    let overallProgress = 0;

    // Update steps based on actual thesis status
    switch (thesis.status) {
      case "TOPIC_APPROVED":
      case "PROPOSAL_APPROVED":
      case "APPROVED":
        steps[0].status = "completed";
        steps[1].status = "completed";
        steps[2].status = "completed";
        steps[3].status = "completed";
        overallProgress = 100;
        break;
      case "TOPIC_REVIEW":
      case "PROPOSAL_REVIEW":
      case "DRAFT_REVIEW":
      case "FINAL_REVIEW":
        steps[0].status = "completed";
        steps[1].status = "completed";
        steps[2].status = "completed";
        steps[3].status = "in_progress";
        overallProgress = 75;
        break;
      case "RESEARCH_PHASE":
      case "WRITING_PHASE":
        steps[0].status = "completed";
        steps[1].status = "completed";
        steps[2].status = "in_progress";
        steps[3].status = "pending";
        overallProgress = 50;
        break;
      case "PROPOSAL_WRITING":
        steps[0].status = "completed";
        steps[1].status = "in_progress";
        steps[2].status = "pending";
        steps[3].status = "pending";
        overallProgress = 25;
        break;
      case "TOPIC_SUBMISSION":
        steps[0].status = "in_progress";
        steps[1].status = "pending";
        steps[2].status = "pending";
        steps[3].status = "pending";
        overallProgress = 10;
        break;
      default:
        // No thesis submitted
        steps[0].status = "pending";
        steps[1].status = "pending";
        steps[2].status = "pending";
        steps[3].status = "pending";
        overallProgress = 0;
        break;
    }

    return {
      overall_progress: overallProgress,
      steps: steps,
    };
  };

  const handleUpdateThesisStatus = async (thesisId: number, newStatus: string) => {
    try {
      await updateThesisStatus(thesisId, newStatus);
      alert("Thesis status updated successfully!");
      // Refresh the data
      await loadGroupsAndProposals();
    } catch (error) {
      console.error("Failed to update thesis status:", error);
      alert("Failed to update thesis status");
    }
  };

  // Add function to load users for the proposal form
  const loadUsersAndGroups = async () => {
    try {
      // Fetch all users
      const usersData = await fetchUsers();
      setUsers(usersData);
      
      // Fetch student groups to check if user already has an active group
      const groupsData = await fetchStudentGroups();
      setStudentGroups(groupsData);
    } catch (err: any) {
      console.error("Failed to load data:", err);
    }
  };

  // Add function to get filtered users by role
  const getFilteredUsers = (role: string) => {
    return users.filter(u => u.role === role);
  };

  // Add function to reset the proposal form
  const resetProposalForm = () => {
    setProposalForm({
      title: "",
      description: ""
    });
    setSelectedStudents([user?.id || 0]);
    setSelectedAdviser(null);
  };

  // Add function to toggle student selection
  const toggleStudentSelection = (userId: number) => {
    // Ensure the current user is always part of the group
    if (userId === user?.id) return;
    
    setSelectedStudents(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  // Add function to handle propose group button click
  const handleProposeGroupClick = async () => {
    // Load users and groups to check active group status
    await loadUsersAndGroups();
    
    // Check if user already has an active group or existing proposal
    if (hasActiveGroupOrProposal()) {
      // Show the "already in group" modal instead of the proposal form modal
      setShowAlreadyInGroupModal(true);
    } else {
      // Show the proposal form modal
      setShowProposalModal(true);
    }
  };

  // Add function to handle proposal submission
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalForm.title.trim()) {
      alert("Please provide a group title.");
      return;
    }
    
    if (!proposalForm.description.trim()) {
      alert("Please provide a description or problem statement.");
      return;
    }
    
    if (selectedStudents.length === 0) {
      alert("Please select at least one group member.");
      return;
    }

    setSubmittingProposal(true);
    try {
      // Create the group proposal
      const proposalData: any = {
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim(),
        students: selectedStudents
      };
      
      // Add preferred adviser if selected
      if (selectedAdviser) {
        proposalData.preferred_adviser = selectedAdviser;
      }
      
      await createGroupProposal(proposalData);
      
      alert("Group proposal submitted successfully! An admin will review your proposal.");
      resetProposalForm();
      setShowProposalModal(false);
      // Reload proposals to show the new one
      await loadGroupsAndProposals();
    } catch (error: any) {
      console.error("Failed to submit proposal:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data || error?.message || "Failed to submit proposal. Please try again.";
      alert(`Failed to submit proposal: ${message}`);
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Add function to get status badge class for proposals
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-academic-warning bg-opacity-10 text-academic-warning";
      case 'adviser_assigned':
        return "bg-academic-primary bg-opacity-10 text-academic-primary";
      case 'active':
        return "bg-academic-success bg-opacity-10 text-academic-success";
      case 'rejected':
        return "bg-academic-danger bg-opacity-10 text-academic-danger";
      default:
        return "bg-academic-muted bg-opacity-10 text-academic-muted";
    }
  };

  // Add function to get status text for proposals
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return "Pending Approval";
      case 'adviser_assigned':
        return "Awaiting Adviser Confirmation";
      case 'active':
        return "Active";
      case 'rejected':
        return "Rejected";
      default:
        return status;
    }
  };

  // Helper function to safely get user name
  const getUserName = (user: User | null | undefined) => {
    if (!user) return "Unknown";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

  // Helper function to safely get panel member name
  const getPanelMemberName = (panel: any) => {
    if (!panel) return "Unknown Panel Member";
    const fullName = `${panel.first_name || ""} ${panel.last_name || ""}`.trim();
    return fullName || panel.username || `Panel Member ${panel.id}`;
  };

  // Add function to handle delete proposal
  const handleDeleteProposal = (proposalId: number) => {
    setProposalToDelete(proposalId);
    setShowDeleteModal(true);
  };

  // Add function to confirm delete proposal
  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;
    
    try {
      await deleteGroupProposal(proposalToDelete);
      // Reload proposals after deletion
      await loadGroupsAndProposals();
      setShowDeleteModal(false);
      setProposalToDelete(null);
      alert("Proposal deleted successfully!");
    } catch (error: any) {
      console.error("Failed to delete proposal:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to delete proposal. Please try again.";
      alert(`Failed to delete proposal: ${message}`);
    }
  };

  // Add function to handle leave proposal
  const handleLeaveProposal = (proposalId: number) => {
    setProposalToLeave(proposalId);
    setShowLeaveModal(true);
  };

  // Add function to confirm leave proposal
  const confirmLeaveProposal = async () => {
    if (!proposalToLeave || !user) return;
    
    try {
      await removeStudentFromProposal(proposalToLeave, user.id);
      // Reload proposals after leaving
      await loadGroupsAndProposals();
      setShowLeaveModal(false);
      setProposalToLeave(null);
      alert("You have left the proposal successfully!");
    } catch (error: any) {
      console.error("Failed to leave proposal:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to leave proposal. Please try again.";
      alert(`Failed to leave proposal: ${message}`);
    }
  };

  // Add function to handle accept proposal
  const handleAcceptProposal = async (proposalId: number) => {
    setAcceptingProposal(true);
    try {
      // Call the API to accept the proposal
      await adviserAcceptProposal(proposalId);
      
      // Update the local state to reflect the change
      setProposals(prevProposals => 
        prevProposals.map(proposal => 
          proposal.id === proposalId 
            ? { ...proposal, status: 'active' } 
            : proposal
        )
      );
      
      alert("Proposal accepted successfully!");
    } catch (error: any) {
      console.error("Failed to accept proposal:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to accept proposal. Please try again.";
      alert(`Failed to accept proposal: ${message}`);
    } finally {
      setAcceptingProposal(false);
    }
  };

  // Update function to handle reject proposal
  const handleRejectProposal = (proposalId: number) => {
    setProposalToReject(proposalId);
    setShowRejectModal(true);
  };

  // Update function to confirm reject proposal
  const confirmRejectProposal = async () => {
    if (!proposalToReject) return;
    
    setRejectingProposal(true);
    try {
      // Call the API to reject the proposal with reason
      await adviserRejectProposal(proposalToReject, rejectionReason);
      
      // Update the local state to reflect the change
      setProposals(prevProposals => 
        prevProposals.map(proposal => 
          proposal.id === proposalToReject 
            ? { ...proposal, status: 'rejected' } 
            : proposal
        )
      );
      
      alert("Proposal rejected successfully!");
      
      // Reset the rejection state
      setShowRejectModal(false);
      setProposalToReject(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Failed to reject proposal:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to reject proposal. Please try again.";
      alert(`Failed to reject proposal: ${message}`);
    } finally {
      setRejectingProposal(false);
    }
  };

  // Add function to check if user has an active group or existing proposal
  const hasActiveGroupOrProposal = () => {
    if (!user) return false;
    
    // Check if user is part of an active group
    const isInActiveGroup = studentGroups.some(group => 
      group.is_active && group.students.some(student => student.id === user.id)
    );
    
    // Check if user has any existing proposals (regardless of status)
    const hasExistingProposal = proposals.some(proposal => 
      proposal.students.some(student => student.id === user.id)
    );
    
    return isInActiveGroup || hasExistingProposal;
  };

  return (
    <>
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
          <h1 className="text-2xl font-semibold mb-1">
            {isStudent ? "My Group" : "My Groups"}
          </h1>
          <p className="text-sm opacity-90 max-w-none">
            {isAdviser ? "Manage your advised thesis groups" : 
             isStudent ? "View and manage your thesis group" : "View and manage your thesis groups"}
          </p>
        </div>

      {/* Already In Group Modal */}
      {showAlreadyInGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-academic max-w-md w-full">
            <div className="card-academic-header p-3 mb-3">
              <div className="flex justify-between items-center">
                <h2 className="card-academic-title text-lg">
                  Group Proposal Not Allowed
                </h2>
                <button
                  onClick={() => setShowAlreadyInGroupModal(false)}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="card-academic-body space-y-4 px-3 pb-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Cannot Propose New Group</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Your proposed thesis title/topic is the foundation of your research group. It will be reviewed by administrators and assigned advisers to ensure proper guidance and resources.</p>
                      <p className="mt-2">You already have an existing group proposal or are part of an active group. According to university policy, students can only have one group proposal or active group at a time.</p>
                      <p className="mt-2">You must wait for your current proposal to be processed or leave your current group before proposing a new group.</p>
                    </div>
                  </div>
                </div>
              </div>
            
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAlreadyInGroupModal(false)}
                  className="btn-academic py-1.5 px-3 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-academic max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="card-academic-header p-3 mb-3">
              <div className="flex justify-between items-center">
                <h2 className="card-academic-title text-lg">
                  {isStudent ? "Propose New Thesis Group" : "Propose New Groups"}
                </h2>
                <button
                  onClick={() => {
                    setShowProposalModal(false);
                    resetProposalForm();
                  }}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-academic-muted mt-1">
                {isStudent 
                  ? "Submit a proposal for your thesis group with your proposed thesis title/topic"
                  : "Submit proposals for your thesis groups"}
              </p>
            </div>
            
            <form onSubmit={handleCreateProposal} className="card-academic-body space-y-4 px-3 pb-3">
              <div className="mb-4 p-3 bg-academic-light border border-academic-border rounded-lg">
                <h3 className="text-sm font-semibold text-academic-text mb-2">Proposed Thesis Title / Topic *</h3>
                <p className="text-xs text-academic-muted mb-3">
                  Your proposed thesis title/topic is the foundation of your research group. It will be reviewed by administrators and assigned advisers to ensure proper guidance and resources.
                </p>
                <input
                  type="text"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({...proposalForm, title: e.target.value})}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  placeholder="Enter your proposed thesis title or topic"
                  required
                />
                <p className="text-xs text-academic-muted mt-2">
                  Please provide a clear and concise title that accurately represents your research focus.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label-academic text-xs mb-1">
                    Group Description or Problem Statement *
                  </label>
                  <textarea
                    value={proposalForm.description}
                    onChange={(e) => setProposalForm({...proposalForm, description: e.target.value})}
                    className="form-input-academic text-sm py-2 px-3 w-full"
                    placeholder="Enter a brief description of your group's focus or problem statement"
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Students Selection */}
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Select Group Members *
                </label>
                <div className="border border-academic-border rounded-lg p-3 max-h-60 overflow-y-auto">
                  {getFilteredUsers("Student").length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getFilteredUsers("Student").map(student => (
                        <div key={student.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            disabled={student.id === user?.id}
                            className="form-checkbox-academic h-4 w-4 text-academic-primary"
                          />
                          <label 
                            htmlFor={`student-${student.id}`} 
                            className="ml-2 text-sm text-academic-text"
                          >
                            {student.first_name} {student.last_name} ({student.username})
                            {student.id === user?.id && (
                              <span className="ml-2 text-xs text-academic-primary">(You - Required)</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-academic-muted text-sm">No students available</p>
                  )}
                </div>
                <p className="text-xs text-academic-muted mt-1">
                  Note: You are automatically included in the group. Other students can be added or removed.
                </p>
              </div>
              
              {/* Adviser Selection */}
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Preferred Adviser (Optional)
                </label>
                <select
                  value={selectedAdviser || ""}
                  onChange={(e) => setSelectedAdviser(e.target.value ? parseInt(e.target.value) : null)}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                >
                  <option value="">No preference</option>
                  {getFilteredUsers("Adviser").map(adviser => (
                    <option key={adviser.id} value={adviser.id}>
                      {adviser.first_name} {adviser.last_name} ({adviser.username})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-3 border-t border-academic-border">
                <button
                  type="button"
                  onClick={resetProposalForm}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal || !proposalForm.title.trim() || selectedStudents.length === 0}
                  className="btn-academic py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Display Group Proposals for Students */}
      {isStudent && (
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-semibold">
                {isStudent ? "Group Proposal" : "My Group Proposals"}
              </h2>
              <p className="text-sm text-academic-muted mt-1">
                Submit a proposal for your thesis group. According to university policy, students can only have one group proposal or active group at a time.
              </p>
            </div>
            <button
              onClick={handleProposeGroupClick}
              className="btn-academic py-1.5 px-3 text-sm"
            >
              Propose a Group
            </button>
          </div>
          
          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="card-academic">
                <div className="card-academic-body p-4">
                  {/* Display proposal content horizontally */}
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Proposal Title and Description */}
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="card-academic-title text-lg mb-2">
                        {proposal.title}
                      </h3>
                      
                      {proposal.description && (
                        <p className="text-sm text-academic-muted mb-3">
                          {proposal.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-academic-muted">
                        <span className="font-medium">Submitted:</span>
                        <span className="ml-1">
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-academic-muted mt-1">
                        <span className="font-medium">Submitted by:</span>
                        <span className="ml-1">
                          {getUserName(proposal.created_by)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Students - First student aligned with "Students:" label */}
                    <div className="min-w-[150px]">
                      <div className="flex items-start">
                        <h4 className="text-xs font-medium text-academic-text mr-1">
                          {isStudent ? "Student:" : "Students:"}
                        </h4>
                        <div className="flex flex-col gap-1">
                          {proposal.students.map((student) => (
                            <span
                              key={student.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary"
                            >
                              {student.first_name} {student.last_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="min-w-[120px]">
                      <div className="flex items-center">
                        <span className="font-medium text-xs">Status:</span>
                        <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(proposal.status)}`}>
                          {getStatusText(proposal.status)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Advisers */}
                    <div className="min-w-[150px]">
                      <div className="text-xs text-academic-muted mb-1">
                        <span className="font-medium">Preferred:</span>
                        <span className="ml-1">
                          {proposal.preferred_adviser ? getUserName(proposal.preferred_adviser) : "None"}
                        </span>
                      </div>
                      <div className="text-xs text-academic-muted">
                        <span className="font-medium">Assigned:</span>
                        <span className="ml-1">
                          {proposal.assigned_adviser ? getUserName(proposal.assigned_adviser) : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-academic-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-academic-muted">
                        Proposal ID: {proposal.id}
                      </div>
                      <div className="flex space-x-2">
                        {/* Show delete button if user is the creator of the proposal */}
                        {user && proposal.created_by.id === user.id && (
                          <button 
                            onClick={() => handleDeleteProposal(proposal.id)}
                            className="btn-academic-danger py-1.5 px-3 text-sm"
                          >
                            Delete
                          </button>
                        )}
                        {/* Show leave button if user is a member but not the creator */}
                        {user && proposal.created_by.id !== user.id && proposal.students.some(student => student.id === user.id) && (
                          <button 
                            onClick={() => handleLeaveProposal(proposal.id)}
                            className="btn-academic-secondary py-1.5 px-3 text-sm"
                          >
                            Leave
                          </button>
                        )}
                        <button 
                          onClick={() => alert('Proposal details would be shown here. This functionality can be implemented as needed.')}
                          className="btn-academic py-1.5 px-3 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display Group Proposals for Advisers */}
      {isAdviser && (
        <div className="mb-4">
          <div className="mb-2">
            <h1 className="text-2xl font-semibold mb-1">Group Proposals</h1>
            <p className="text-sm opacity-90 max-w-none">
              Review and manage group proposals assigned to you
            </p>
          </div>
          <div className="card-academic">
            <div className="card-academic-body px-3 pb-3">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-academic-border">
                  <thead className="bg-academic-light">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Proposal
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Preferred Adviser
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-academic-white divide-y divide-academic-border">
                    {proposals.filter(proposal => proposal.assigned_adviser?.id === user?.id).length > 0 ? (
                      proposals
                        .filter(proposal => proposal.assigned_adviser?.id === user?.id)
                        .map((proposal) => (
                          <tr key={proposal.id} className="hover:bg-academic-light">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-academic-text">
                                {proposal.title || "Untitled Proposal"}
                              </div>
                              {proposal.description && (
                                <div className="text-xs text-academic-muted mt-1">
                                  {proposal.description}
                                </div>
                              )}
                              <div className="text-xs text-academic-muted mt-1">
                                Submitted by: {proposal.created_by ? getUserName(proposal.created_by) : "Unknown"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {proposal.students && Array.isArray(proposal.students) && proposal.students.length > 0 ? (
                                  proposal.students.map((student) => (
                                    <span
                                      key={student.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary"
                                    >
                                      {getUserName(student)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-academic-muted">No students</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                              {proposal.preferred_adviser ? getUserName(proposal.preferred_adviser) : "No preference"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(proposal.status)}`}
                              >
                                {getStatusText(proposal.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                              {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString() : "Unknown"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {proposal.status === 'adviser_assigned' && (
                                <div className="flex flex-col gap-2">
                                  <button 
                                    onClick={() => handleAcceptProposal(proposal.id)}
                                    disabled={acceptingProposal}
                                    className="btn-academic py-1 px-2 text-xs disabled:opacity-50"
                                  >
                                    {acceptingProposal ? 'Accepting...' : 'Accept'}
                                  </button>
                                  <button 
                                    onClick={() => handleRejectProposal(proposal.id)}
                                    className="btn-academic-danger py-1 px-2 text-xs"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {proposal.status === 'active' && (
                                <div className="text-xs text-academic-success">
                                  Group activated
                                </div>
                              )}
                              {proposal.status === 'rejected' && (
                                <div className="text-xs text-academic-danger">
                                  Proposal rejected
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-academic-muted">
                          No group proposals assigned to you yet. Group proposals will appear here when administrators assign them to you.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Display Active Groups */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-3">
          {isStudent ? "Active Group" : 
           isAdviser ? "Advised Groups" : "My Active Groups"}
        </h2>
        
        {groups.length === 0 ? (
          <div className="card-academic text-center">
            <div className="card-academic-body p-4">
              <div className="text-academic-text text-sm font-medium">
                {isAdviser ? "No thesis groups assigned yet" : 
                 isStudent ? "No active group yet" : "No active groups yet"}
              </div>
              <p className="text-academic-muted mt-1 text-xs">
                {isAdviser 
                  ? "Groups will appear here when students are assigned to you" 
                  : isStudent 
                  ? "Active group will appear here once proposals are approved"
                  : "Active groups will appear here once proposals are approved"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <div key={group.id} className="card-academic">
                <div className="card-academic-body p-4">
                  {/* Display group content horizontally like proposal section */}
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Group Name and Basic Info */}
                    <div className="flex-1 min-w-[200px]">
                      <h2 className="card-academic-title text-lg mb-2">
                        {group.name}
                      </h2>
                      
                      <div className="flex items-center space-x-3 text-xs text-academic-muted">
                        <div className="flex items-center">
                          <span className="font-medium">Created:</span>
                          <span className="ml-1">
                            {new Date(group.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">Status:</span>
                          <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            group.is_active ? 'bg-academic-success bg-opacity-10 text-academic-success' : 'bg-academic-danger bg-opacity-10 text-academic-danger'
                          }`}>
                            {group.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Students - First student aligned with "Students:" label */}
                    <div className="min-w-[150px]">
                      <div className="flex items-start">
                        <h3 className="text-xs font-medium text-academic-text mr-1">{isStudent ? "Student:" : "Students:"}</h3>
                        <div className="flex flex-wrap gap-1">
                          {group.students.map((student) => (
                            <span
                              key={student.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary"
                            >
                              {student.first_name} {student.last_name} ({student.student_id || student.username})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Adviser */}
                    <div className="min-w-[150px]">
                      <div className="text-xs text-academic-muted">
                        <span className="font-medium">Adviser:</span>
                        <span className="ml-1">
                          {group.adviser ? getUserName(group.adviser) : "Not assigned yet"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Panel Members */}
                    <div className="min-w-[150px]">
                      <div className="flex items-start">
                        <h3 className="text-xs font-medium text-academic-text mr-1">Panel:</h3>
                        {group.panel_members && group.panel_members.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {group.panel_members.map((panel) => (
                              <span
                                key={panel.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary"
                              >
                                {getPanelMemberName(panel)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-academic-muted">None assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thesis Progress Section */}
                  {groupProgress[group.id] && (
                    <div className="border-t border-academic-border pt-3 mt-3">
                      <h3 className="text-sm font-semibold text-academic-text mb-3">Thesis Progress</h3>
                      <div className="bg-academic-light rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-academic-muted">Overall Progress</span>
                          <span className="text-xs font-medium text-academic-text">{groupProgress[group.id].overall_progress}%</span>
                        </div>
                        <div className="w-full bg-academic-border rounded-full h-1.5 mb-3">
                          <div 
                            className="bg-academic-primary h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${groupProgress[group.id].overall_progress}%` }}
                          ></div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {groupProgress[group.id].steps.map((step, index) => (
                            <div key={index} className="text-center">
                              <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                                step.status === 'completed' ? 'bg-academic-success' : 
                                step.status === 'in_progress' ? 'bg-academic-warning' : 'bg-academic-border'
                              }`}></div>
                              <div className="text-xs font-medium text-academic-text">{step.name}</div>
                              <div className={`text-xs ${
                                step.status === 'completed' ? 'text-academic-success' : 
                                step.status === 'in_progress' ? 'text-academic-warning' : 'text-academic-muted'
                              }`}>
                                {step.status === 'completed' ? '✓ Complete' : 
                                 step.status === 'in_progress' ? 'In Progress' : 'Pending'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-academic-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-3">
                        {isAdviser ? (
                          <>
                            <button 
                              onClick={() => navigate('/thesis')}
                              className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium"
                            >
                              View Theses
                            </button>
                            <button className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium">
                              Manage Students
                            </button>
                            <button className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium">
                              Assign Panel
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => navigate('/thesis')}
                              className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium"
                            >
                              View My Thesis
                            </button>
                            <button className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium">
                              View Group Details
                            </button>
                            <button className="text-academic-primary hover:text-academic-secondary transition-colors text-xs font-medium">
                              Invite Members
                            </button>
                            <button className="text-academic-danger hover:text-academic-secondary transition-colors text-xs font-medium">
                              {isStudent ? "Leave Group" : "Leave Group"}
                            </button>
                          </>
                        )}
                      </div>
                      
                      <button className="btn-academic py-1.5 px-3 text-sm">
                        {isAdviser ? 'View Details' : 'Manage Group'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-academic max-w-md w-full">
            <div className="card-academic-header p-3 mb-3">
              <div className="flex justify-between items-center">
                <h2 className="card-academic-title text-lg">
                  Confirm Delete
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProposalToDelete(null);
                  }}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="card-academic-body space-y-4 px-3 pb-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Delete Proposal</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Are you sure you want to delete this group proposal? This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProposalToDelete(null);
                  }}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProposal}
                  className="btn-academic-danger py-1.5 px-3 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-academic max-w-md w-full">
            <div className="card-academic-header p-3 mb-3">
              <div className="flex justify-between items-center">
                <h2 className="card-academic-title text-lg">
                  Confirm Leave
                </h2>
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setProposalToLeave(null);
                  }}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="card-academic-body space-y-4 px-3 pb-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Leave Proposal</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Are you sure you want to leave this group proposal? You will no longer be part of this proposed group.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setProposalToLeave(null);
                  }}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveProposal}
                  className="btn-academic py-1.5 px-3 text-sm"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-academic max-w-md w-full">
            <div className="card-academic-header p-3 mb-3">
              <div className="flex justify-between items-center">
                <h2 className="card-academic-title text-lg">
                  Reject Proposal
                </h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setProposalToReject(null);
                    setRejectionReason("");
                  }}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="card-academic-body space-y-4 px-3 pb-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Reject Proposal</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Please provide a reason for rejecting this proposal. This will help the students understand how to improve their proposal.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="form-label-academic text-xs">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  placeholder="Enter the reason for rejecting this proposal"
                  rows={3}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setProposalToReject(null);
                    setRejectionReason("");
                  }}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRejectProposal}
                  disabled={!rejectionReason.trim()}
                  className="btn-academic-danger py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}