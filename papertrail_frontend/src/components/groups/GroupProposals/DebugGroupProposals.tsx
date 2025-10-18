import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { fetchGroupProposals, fetchUsers } from "../../../services/api";

export default function DebugGroupProposals() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.log("Proposals data:", proposalsData);
      setProposals(proposalsData);
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
      <h1 className="text-2xl font-bold mb-4">Debug Group Proposals</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users ({users.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
          {JSON.stringify(users, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Proposals ({proposals.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(proposals, null, 2)}
        </pre>
      </div>
    </div>
  );
}