import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { fetchGroupProposals, fetchUsers } from "../../../services/api";

export default function TestDataDisplay() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all users
      const usersData = await fetchUsers();
      console.log("Users data:", usersData);
      setUsers(usersData);
      
      // Fetch all proposals
      const proposalsData = await fetchGroupProposals();
      console.log("Proposals data:", proposalsData);
      setProposals(proposalsData);
      
      // Check roles
      console.log("User roles:", usersData.map(u => ({id: u.id, username: u.username, role: u.role})));
      
      // Check if we have advisers
      const advisers = usersData.filter(u => u.role && u.role.toLowerCase() === "adviser");
      console.log("Advisers:", advisers);
      
      // Check proposal structure
      if (Array.isArray(proposalsData) && proposalsData.length > 0) {
        console.log("First proposal:", proposalsData[0]);
        console.log("First proposal created_by:", proposalsData[0].created_by);
        console.log("First proposal students:", proposalsData[0].students);
        console.log("First proposal preferred_adviser:", proposalsData[0].preferred_adviser);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to load data. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role.toLowerCase() !== "admin") {
    return <div>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return <div>Loading data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test Data Display</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-medium">Total Users</h3>
            <p className="text-2xl">{users.length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-medium">Advisers</h3>
            <p className="text-2xl">{users.filter(u => u.role && u.role.toLowerCase() === "adviser").length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-medium">Students</h3>
            <p className="text-2xl">{users.filter(u => u.role && u.role.toLowerCase() === "student").length}</p>
          </div>
        </div>
        
        <h3 className="font-medium mb-2">User Roles Distribution</h3>
        <ul className="list-disc pl-5">
          {Array.from(new Set(users.map(u => u.role))).map(role => (
            <li key={role}>
              {role}: {users.filter(u => u.role === role).length} users
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Proposals Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-medium">Total Proposals</h3>
            <p className="text-2xl">{proposals.length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-medium">Pending</h3>
            <p className="text-2xl">{proposals.filter(p => p.status === 'pending').length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-medium">Adviser Assigned</h3>
            <p className="text-2xl">{proposals.filter(p => p.status === 'adviser_assigned').length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <h3 className="font-medium">Active</h3>
            <p className="text-2xl">{proposals.filter(p => p.status === 'active').length}</p>
          </div>
        </div>
        
        {proposals.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">First Proposal Details</h3>
            <div className="bg-gray-100 p-4 rounded">
              <pre>{JSON.stringify(proposals[0], null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}