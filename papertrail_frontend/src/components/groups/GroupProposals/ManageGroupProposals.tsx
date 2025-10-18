import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { fetchGroupProposals, assignAdviserToProposal, fetchUsers } from "../../../services/api";
import "../../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

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
  student_group?: any;
}

export default function ManageGroupProposals() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [proposals, setProposals] = useState<GroupProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<{[key: number]: boolean}>({});
  
  // Form states
  const [selectedAdviser, setSelectedAdviser] = useState<{[key: number]: number | null}>({});

  useEffect(() => {
    loadUsersAndProposals();
  }, []);

  const loadUsersAndProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all users
      const usersData = await fetchUsers();
      console.log("Users data:", usersData);
      setUsers(usersData);
      
      // Fetch all proposals
      const proposalsData = await fetchGroupProposals();
      console.log("Proposals raw data:", proposalsData);
      
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
      
      console.log("Validated proposals:", validatedProposals);
      setProposals(validatedProposals);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to load data. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAdviser = async (proposalId: number) => {
    const adviserId = selectedAdviser[proposalId];
    if (!adviserId) {
      alert("Please select an adviser.");
      return;
    }

    setAssigning(prev => ({...prev, [proposalId]: true}));
    try {
      await assignAdviserToProposal(proposalId, adviserId);
      alert("Adviser assigned successfully!");
      await loadUsersAndProposals(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to assign adviser:", error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Failed to assign adviser. Please try again.";
      alert(`Failed to assign adviser: ${message}`);
    } finally {
      setAssigning(prev => ({...prev, [proposalId]: false}));
    }
  };

  const getAdvisers = () => {
    return users.filter(u => u.role && u.role.toLowerCase() === "adviser");
  };

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

  // Helper function to safely get student names
  const getStudentNames = (students: User[] | null | undefined) => {
    if (!students || !Array.isArray(students) || students.length === 0) {
      return "No students";
    }
    return students.map(student => getUserName(student)).join(", ");
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
        <div className="text-sm text-academic-text">Loading proposals and users...</div>
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
              onClick={loadUsersAndProposals}
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
    <div className="min-h-screen bg-academic-light py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-bold text-academic-text text-xl">Manage Group Proposals</h1>
        </div>

        {/* Debug info */}
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
          <p>Users count: {users.length}</p>
          <p>Proposals count: {proposals.length}</p>
          <p>Advisers count: {getAdvisers().length}</p>
        </div>

        {/* Proposals Table */}
        <div className="bg-academic-white shadow-sm rounded-lg overflow-hidden border border-academic-border">
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
                  Assigned Adviser
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
              {proposals.length > 0 ? (
                proposals.map((proposal) => (
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                      {proposal.assigned_adviser ? getUserName(proposal.assigned_adviser) : "Not assigned"}
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
                      {proposal.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <select
                            value={selectedAdviser[proposal.id] || ""}
                            onChange={(e) => setSelectedAdviser(prev => ({
                              ...prev,
                              [proposal.id]: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            className="form-input-academic text-xs py-1 px-2 w-full"
                          >
                            <option value="">Select adviser</option>
                            {getAdvisers().map(adviser => (
                              <option key={adviser.id} value={adviser.id}>
                                {getUserName(adviser)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignAdviser(proposal.id)}
                            disabled={assigning[proposal.id]}
                            className="btn-academic py-1 px-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assigning[proposal.id] ? 'Assigning...' : 'Assign Adviser'}
                          </button>
                        </div>
                      )}
                      {proposal.status === 'adviser_assigned' && (
                        <div className="text-xs text-academic-primary">
                          Awaiting adviser confirmation
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
                  <td colSpan={7} className="px-4 py-4 text-center text-academic-muted">
                    No group proposals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Workflow Information */}
        <div className="card-academic mt-6">
          <div className="card-academic-header p-3">
            <h2 className="card-academic-title text-lg">
              Group Proposal Management Workflow
            </h2>
          </div>
          <div className="card-academic-body px-3 pb-3">
            <ol className="list-decimal list-inside space-y-2 text-sm text-academic-text">
              <li><span className="font-medium">Review Proposals</span> - Check submitted proposals for completeness and eligibility</li>
              <li><span className="font-medium">Assign Adviser</span> - Assign an appropriate adviser to each proposal</li>
              <li><span className="font-medium">Await Confirmation</span> - Wait for the adviser to accept or reject the assignment</li>
              <li><span className="font-medium">Handle Rejections</span> - If rejected, reassign to another adviser</li>
              <li><span className="font-medium">Group Activation</span> - Once accepted, the group becomes active in the system</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}