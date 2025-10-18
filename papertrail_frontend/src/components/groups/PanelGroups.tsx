import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchStudentGroups } from "../../services/api";
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
}

export default function PanelGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const groupsData = await fetchStudentGroups();
      console.log("Groups data:", groupsData);
      
      setGroups(groupsData);
    } catch (err: any) {
      console.error("Failed to load groups:", err);
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to load groups. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely get user name
  const getUserName = (user: User | null | undefined) => {
    if (!user) return "Unknown";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

  if (user?.role.toLowerCase() !== "panel") {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center p-4">
        <div className="bg-academic-danger bg-opacity-10 border border-academic-danger text-academic-danger px-3 py-2 rounded-md max-w-md">
          Access denied. Panel member privileges required.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center py-4">
        <div className="text-sm text-academic-text">Loading groups...</div>
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
              onClick={loadGroups}
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
          <h1 className="font-bold text-academic-text text-xl">My Groups</h1>
        </div>

        {/* Groups Table */}
        <div className="bg-academic-white shadow-sm rounded-lg overflow-hidden border border-academic-border">
          <div className="p-2 bg-yellow-100 border-b border-yellow-300 text-sm">
            <p>Total groups assigned: {groups.length}</p>
          </div>
          
          <table className="min-w-full divide-y divide-academic-border">
            <thead className="bg-academic-light">
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
                  Details
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-academic-white divide-y divide-academic-border">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <tr key={group.id} className="hover:bg-academic-light">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-academic-text">
                          {group.name}
                        </div>
                        {group.created_by ? (
                          <div className="text-xs text-academic-muted">
                            Created by: {getUserName(group.created_by)}
                          </div>
                        ) : (
                          <div className="text-xs text-academic-muted">
                            Created by: Unknown
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {group.students && group.students.length > 0 ? (
                          group.students.map((student) => (
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
                      {group.adviser ? getUserName(group.adviser) : "Not assigned"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                      {group.year && <div>Year: {group.year}</div>}
                      {group.course && <div>Course: {group.course}</div>}
                      {group.thesis_title && <div>Title: {group.thesis_title}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          group.is_active
                            ? "bg-academic-success bg-opacity-10 text-academic-success"
                            : "bg-academic-danger bg-opacity-10 text-academic-danger"
                        }`}
                      >
                        {group.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-academic-muted">
                    No groups assigned to you. You will be assigned to groups by administrators.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}