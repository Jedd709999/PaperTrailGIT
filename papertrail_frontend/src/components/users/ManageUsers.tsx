import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export default function ManageUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "Student",
    password: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // TODO: Implement API call to fetch users
      // For now, using mock data
      setUsers([
        {
          id: 1,
          username: "john_doe",
          email: "john@example.com",
          first_name: "John",
          last_name: "Doe",
          role: "Student",
          is_active: true,
        },
        {
          id: 2,
          username: "jane_smith",
          email: "jane@example.com",
          first_name: "Jane",
          last_name: "Smith",
          role: "Adviser",
          is_active: true,
        },
      ]);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implement API call to create user
      alert("User created successfully!");
      setShowAddUser(false);
      setNewUser({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        role: "Student",
        password: "",
      });
      loadUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("Failed to create user");
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      // TODO: Implement API call to toggle user status
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: !u.is_active } : u
      ));
      alert("User status updated successfully!");
    } catch (error) {
      console.error("Failed to update user status:", error);
      alert("Failed to update user status");
    }
  };

  if (user?.role.toLowerCase() !== "admin") {
    return (
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="card-academic text-center border border-academic-danger text-academic-danger max-w-md">
            <div className="card-academic-body p-4">
              <p className="text-sm">Access denied. Admin privileges required.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner-academic mx-auto mb-4"></div>
            <p className="text-academic-text">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
        <h1 className="text-2xl font-semibold mb-1">Manage Users</h1>
        <p className="text-sm opacity-90 max-w-none">
          Add, edit, and manage user accounts
        </p>
      </div>

      <div className="card-academic mb-4">
        <div className="card-academic-header flex justify-between items-center p-3 mb-3">
          <h2 className="card-academic-title text-lg">User Management</h2>
          <button
            onClick={() => setShowAddUser(true)}
            className="btn-academic py-1.5 px-3 text-sm"
          >
            Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="card-academic-body px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-academic-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-academic-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-academic-border">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-academic-light">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-academic-text">
                          {usr.first_name} {usr.last_name}
                        </div>
                        <div className="text-xs text-academic-muted">@{usr.username}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-academic-text">
                      {usr.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-academic-primary bg-opacity-10 text-academic-primary">
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          usr.is_active
                            ? "bg-academic-success bg-opacity-10 text-academic-success"
                            : "bg-academic-danger bg-opacity-10 text-academic-danger"
                        }`}
                      >
                        {usr.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                      <button
                        onClick={() => toggleUserStatus(usr.id)}
                        className={`
                          ${usr.is_active
                            ? "text-academic-danger hover:text-academic-text"
                            : "text-academic-success hover:text-academic-text"
                        } mr-3 transition-colors`}
                      >
                        {usr.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="text-academic-primary hover:text-academic-secondary transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-academic-dark bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="relative card-academic w-full max-w-md">
            <div className="card-academic-header flex justify-between items-center p-3 mb-3">
              <h2 className="card-academic-title text-lg">Add New User</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-academic-muted hover:text-academic-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddUser} className="card-academic-body space-y-3 px-3 pb-3">
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  className="form-input-academic text-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="form-input-academic text-sm py-2 px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label-academic text-xs mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="form-input-academic text-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="form-label-academic text-xs mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="form-input-academic text-sm py-2 px-3"
                  />
                </div>
              </div>
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="form-input-academic text-sm py-2 px-3"
                >
                  <option value="Student">Student</option>
                  <option value="Adviser">Adviser</option>
                  <option value="Panel">Panel</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  className="form-input-academic text-sm py-2 px-3"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-academic-border">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-academic py-1.5 px-3 text-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}