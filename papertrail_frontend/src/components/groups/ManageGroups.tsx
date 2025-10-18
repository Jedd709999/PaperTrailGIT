import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchUsers, fetchStudentGroups, createStudentGroup, updateStudentGroup, assignAdviserToGroup, assignPanelToGroup, deleteStudentGroup } from "../../services/api";
import "../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
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
  year?: number;
  course?: string;
  thesis_title?: string;
  proposal?: GroupProposal; // Add this line to include the proposal relationship
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

export default function ManageGroups() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<{[key: number]: boolean}>({});

  // Panel assignment states
  const [showPanelAssignModal, setShowPanelAssignModal] = useState(false);
  const [selectedPanelMembers, setSelectedPanelMembers] = useState<number[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
  const [assigningPanel, setAssigningPanel] = useState(false);

  // Form states
  const [newGroup, setNewGroup] = useState({
    name: "",
    year: new Date().getFullYear(),
    course: "",
    thesis_title: ""
  });
  
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedAdviser, setSelectedAdviser] = useState<number | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<number[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  useEffect(() => {
    loadUsersAndGroups();
  }, []);

  const loadUsersAndGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all users
      const usersData = await fetchUsers();
      setUsers(usersData);
      
      // Fetch all groups
      const groupsData = await fetchStudentGroups();
      console.log("Groups data:", groupsData); // Debug log
      
      // Add debugging for panel members
      groupsData.forEach((group: StudentGroup) => {
        console.log(`Group ${group.id} (${group.name}) panel members:`, group.panel_members);
      });
      
      setGroups(groupsData);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to load data. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating new group with data:", { newGroup, selectedStudents, selectedAdviser, selectedPanel }); // Debug log
    
    if (!newGroup.name.trim() || selectedStudents.length === 0) {
      alert("Please provide a group name and select at least one student.");
      return;
    }

    setCreating(true);
    try {
      // Create the group with students
      const groupData: any = {
        name: newGroup.name.trim(),
        students: selectedStudents
      };
      
      // Add optional fields if they have values
      if (newGroup.year) groupData.year = newGroup.year;
      if (newGroup.course) groupData.course = newGroup.course;
      if (newGroup.thesis_title) groupData.thesis_title = newGroup.thesis_title;
      
      console.log("Sending group creation data:", groupData); // Debug log
      const createdGroup = await createStudentGroup(groupData);
      console.log("Created group response:", createdGroup); // Debug log
      
      // If adviser or panel members are selected, update the group
      if (selectedAdviser) {
        console.log("Assigning adviser:", createdGroup.id, selectedAdviser); // Debug log
        await assignAdviserToGroup(createdGroup.id, selectedAdviser);
      }
      
      if (selectedPanel.length > 0) {
        console.log("Assigning panel members:", createdGroup.id, selectedPanel); // Debug log
        await assignPanelToGroup(createdGroup.id, selectedPanel);
      }
      
      alert("Group created successfully!");
      resetForm();
      await loadUsersAndGroups(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to create group:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to create group. Please try again.";
      alert(`Failed to create group: ${message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateGroup = async (groupId: number) => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }

    setUpdating(true);
    try {
      // Update the group with students and other fields
      const updateData: any = {
        students: selectedStudents
      };
      
      if (newGroup.name) {
        updateData.name = newGroup.name;
      }
      
      // Add optional fields if they have values
      if (newGroup.year) updateData.year = newGroup.year;
      if (newGroup.course) updateData.course = newGroup.course;
      if (newGroup.thesis_title) updateData.thesis_title = newGroup.thesis_title;
      
      // Add adviser and panel members to the update data
      if (selectedAdviser) {
        updateData.adviser = selectedAdviser;
      }
      
      // Always include panel members in the update data
      updateData.panel_members = selectedPanel;
      
      console.log("Updating group with data:", groupId, updateData); // Debug log
      await updateStudentGroup(groupId, updateData);
      
      alert("Group updated successfully!");
      resetForm();
      await loadUsersAndGroups(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to update group:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to update group. Please try again.";
      alert(`Failed to update group: ${message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    // Find the group to get its name and check if it has an associated proposal
    const group = groups.find(g => g.id === groupId);
    const hasProposal = group && group.proposal && group.proposal.id;
    
    let message = "Are you sure you want to delete this group?";
    if (hasProposal) {
      message += " This will also delete the associated group proposal.";
    }
    message += " This action cannot be undone.";
    
    if (!window.confirm(message)) {
      return;
    }

    setDeleting(prev => ({...prev, [groupId]: true}));
    try {
      await deleteStudentGroup(groupId);
      alert("Group deleted successfully!");
      await loadUsersAndGroups(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to delete group:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to delete group. Please try again.";
      alert(`Failed to delete group: ${message}`);
    } finally {
      setDeleting(prev => ({...prev, [groupId]: false}));
    }
  };

  // Handle panel assignment
  const openPanelAssignModal = (groupId: number) => {
    setCurrentGroupId(groupId);
    setSelectedPanelMembers([]); // Reset selection
    setShowPanelAssignModal(true);
  };

  const handleAssignPanel = async () => {
    if (!currentGroupId) return;
    
    if (selectedPanelMembers.length === 0) {
      alert("Please select at least one panel member.");
      return;
    }

    setAssigningPanel(true);
    try {
      await assignPanelToGroup(currentGroupId, selectedPanelMembers);
      alert("Panel members assigned successfully!");
      setShowPanelAssignModal(false);
      await loadUsersAndGroups(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to assign panel members:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to assign panel members. Please try again.";
      alert(`Failed to assign panel members: ${message}`);
    } finally {
      setAssigningPanel(false);
    }
  };

  const resetForm = () => {
    setNewGroup({
      name: "",
      year: new Date().getFullYear(),
      course: "",
      thesis_title: ""
    });
    setSelectedStudents([]);
    setSelectedAdviser(null);
    setSelectedPanel([]);
    setEditingGroupId(null);
    setShowCreateForm(false);
  };

  const startEditing = (group: StudentGroup) => {
    setNewGroup({
      name: group.name,
      year: group.year || new Date().getFullYear(),
      course: group.course || "",
      thesis_title: group.thesis_title || ""
    });
    setSelectedStudents(group.students.map(s => s.id));
    setSelectedAdviser(group.adviser?.id || null);
    setSelectedPanel(group.panel_members.map(p => p.id));
    setEditingGroupId(group.id);
    setShowCreateForm(true);
  };

  const getFilteredUsers = (role: string) => {
    return users.filter(u => u.role === role);
  };

  const toggleStudentSelection = (userId: number) => {
    setSelectedStudents(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  // Helper function to safely get user name
  const getUserName = (user: User | null | undefined) => {
    if (!user) return "Unknown";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

  if (user?.role.toLowerCase() !== "admin") {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center p-4">
        <div className="bg-academic-danger bg-opacity-10 border border-academic-danger text-academic-danger px-3 py-2 rounded-md max-w-md">
          Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center py-4">
        <div className="text-sm text-academic-text">Loading groups and users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center p-4">
        <div className="bg-academic-danger bg-opacity-10 border border-academic-danger text-academic-danger px-3 py-2 rounded-md max-w-md">
          <div className="flex justify-between items-center">
            <span className="text-sm">{error}</span>
            <button 
              onClick={loadUsersAndGroups}
              className="bg-academic-danger hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
        <h1 className="text-2xl font-semibold mb-1">Manage Groups</h1>
        <p className="text-sm opacity-90 max-w-none">
          Create, edit, and manage student groups
        </p>
      </div>

      <div className="card-academic mb-4">
        <div className="card-academic-header flex justify-between items-center p-3 mb-3">
          <h2 className="card-academic-title text-lg">Group Management</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-academic py-1.5 px-3 text-sm"
          >
            {showCreateForm ? 'Cancel' : 'Create New Group'}
          </button>
        </div>

        {/* Create/Edit Group Form */}
        {showCreateForm && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingGroupId) {
              handleUpdateGroup(editingGroupId);
            } else {
              handleCreateGroup(e);
            }
          }} className="card-academic-body space-y-4 px-3 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  placeholder="Enter group name"
                  required
                />
              </div>
              
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Course
                </label>
                <input
                  type="text"
                  value={newGroup.course}
                  onChange={(e) => setNewGroup({...newGroup, course: e.target.value})}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  placeholder="Enter course name"
                />
              </div>
              
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={newGroup.year || ""}
                  onChange={(e) => setNewGroup({...newGroup, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear()})}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  min="2000"
                  max="2030"
                />
              </div>
              
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Thesis Title (Optional)
                </label>
                <input
                  type="text"
                  value={newGroup.thesis_title}
                  onChange={(e) => setNewGroup({...newGroup, thesis_title: e.target.value})}
                  className="form-input-academic text-sm py-2 px-3 w-full"
                  placeholder="Enter thesis title"
                />
              </div>
            </div>
            
            {/* Students Selection */}
            <div>
              <label className="form-label-academic text-xs mb-1">
                Select Students *
              </label>
              <div className="border border-academic-border rounded-lg p-3 max-h-40 overflow-y-auto">
                {getFilteredUsers("Student").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getFilteredUsers("Student").map(student => (
                      <div key={student.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="form-checkbox-academic h-4 w-4 text-academic-primary"
                        />
                        <label 
                          htmlFor={`student-${student.id}`} 
                          className="ml-2 text-sm text-academic-text"
                        >
                          {student.first_name} {student.last_name} ({student.username})
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-academic-muted text-sm">No students available</p>
                )}
              </div>
            </div>
            
            {/* Adviser Selection */}
            <div>
              <label className="form-label-academic text-xs mb-1">
                Select Adviser
              </label>
              <select
                value={selectedAdviser || ""}
                onChange={(e) => setSelectedAdviser(e.target.value ? parseInt(e.target.value) : null)}
                className="form-input-academic text-sm py-2 px-3 w-full"
              >
                <option value="">Select an adviser</option>
                {getFilteredUsers("Adviser").map(adviser => (
                  <option key={adviser.id} value={adviser.id}>
                    {adviser.first_name} {adviser.last_name} ({adviser.username})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Panel Members Selection */}
            <div>
              <label className="form-label-academic text-xs mb-1">
                Select Panel Members
              </label>
              <select
                multiple
                value={selectedPanel.map(id => id.toString())}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions);
                  const selectedIds = selectedOptions.map(option => parseInt(option.value));
                  setSelectedPanel(selectedIds);
                }}
                className="form-input-academic text-sm py-2 px-3 w-full h-40"
              >
                {getFilteredUsers("Panel").length > 0 ? (
                  getFilteredUsers("Panel").map(panel => (
                    <option key={panel.id} value={panel.id}>
                      {panel.first_name} {panel.last_name} ({panel.username})
                    </option>
                  ))
                ) : (
                  <option disabled>No panel members available</option>
                )}
              </select>
              <div className="text-xs text-academic-muted mt-1">
                Hold Ctrl (Cmd on Mac) to select multiple panel members
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-3 border-t border-academic-border">
              <button
                type="button"
                onClick={resetForm}
                className="btn-academic-secondary py-1.5 px-3 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || updating || !newGroup.name.trim() || selectedStudents.length === 0}
                className="btn-academic py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingGroupId 
                  ? (updating ? 'Updating...' : 'Update Group') 
                  : (creating ? 'Creating...' : 'Create Group')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Groups Table */}
      <div className="card-academic">
        <div className="card-academic-header p-3 mb-3">
          <h2 className="card-academic-title text-lg">Existing Groups</h2>
        </div>
        <div className="card-academic-body px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-academic-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Adviser
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Panel
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-academic-border">
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <tr key={group.id} className="hover:bg-academic-light">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-academic-text">
                          {group.name}
                        </div>
                        {group.course && (
                          <div className="text-xs text-academic-muted">
                            {group.course} {group.year}
                          </div>
                        )}
                        {group.thesis_title && (
                          <div className="text-xs text-academic-text mt-1">
                            Thesis: {group.thesis_title}
                          </div>
                        )}
                        {group.proposal && (
                          <div className="text-xs text-academic-primary mt-1">
                            Proposal: {group.proposal.title}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {group.students && Array.isArray(group.students) && group.students.length > 0 ? (
                            group.students.map((student) => (
                              <span
                                key={student.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary"
                              >
                                {student.first_name} {student.last_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-academic-muted">No students</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {group.adviser ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-primary">
                            {group.adviser.first_name} {group.adviser.last_name}
                          </span>
                        ) : (
                          <span className="text-xs text-academic-muted">No adviser</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {group.panel_members && Array.isArray(group.panel_members) && group.panel_members.length > 0 ? (
                            group.panel_members.map((panel) => (
                              <span
                                key={panel.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-light text-academic-text"
                              >
                                {panel.first_name} {panel.last_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-academic-muted">No panel</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                        {group.created_at ? new Date(group.created_at).toLocaleDateString() : "Unknown"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => startEditing(group)}
                            className="btn-academic py-1 px-2 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openPanelAssignModal(group.id)}
                            className="btn-academic-secondary py-1 px-2 text-xs"
                          >
                            Assign Panel
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            disabled={deleting[group.id] || false}
                            className="text-academic-danger hover:text-academic-text py-1 px-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-academic-muted">
                      No groups found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panel Assignment Modal */}
      {showPanelAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-academic-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b border-academic-border">
              <h3 className="text-lg font-medium text-academic-text">Assign Panel Members</h3>
            </div>
            <div className="p-4">
              <label className="form-label-academic text-xs mb-1">
                Select Panel Members *
              </label>
              <select
                multiple
                value={selectedPanelMembers.map(id => id.toString())}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions);
                  const selectedIds = selectedOptions.map(option => parseInt(option.value));
                  setSelectedPanelMembers(selectedIds);
                }}
                className="form-input-academic text-sm py-2 px-3 w-full h-40"
              >
                {getFilteredUsers("Panel").length > 0 ? (
                  getFilteredUsers("Panel").map(panel => (
                    <option key={panel.id} value={panel.id}>
                      {panel.first_name} {panel.last_name} ({panel.username})
                    </option>
                  ))
                ) : (
                  <option disabled>No panel members available</option>
                )}
              </select>
              <div className="text-xs text-academic-muted mt-1">
                Hold Ctrl (Cmd on Mac) to select multiple panel members
              </div>
            </div>
            <div className="p-4 border-t border-academic-border flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowPanelAssignModal(false)}
                className="btn-academic-secondary py-1.5 px-3 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignPanel}
                disabled={assigningPanel || selectedPanelMembers.length === 0}
                className="btn-academic py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningPanel ? 'Assigning...' : 'Assign Panel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}