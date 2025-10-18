import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchProfile } from "../../services/api";
import "../../styles/academic-theme.css";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await fetchProfile();
      setProfile(data);
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // TODO: Implement profile update API call
    setEditing(false);
    alert("Profile updated successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-academic-light flex items-center justify-center py-4">
        <div className="text-sm text-academic-text">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="card-academic">
          <div className="card-academic-header flex justify-between items-center p-3 mb-3">
            <h1 className="card-academic-title text-lg">My Profile</h1>
            <button
              onClick={() => setEditing(!editing)}
              className="btn-academic py-1.5 px-3 text-sm"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div className="card-academic-body space-y-4 px-3 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label-academic text-xs mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={profile?.username || ""}
                  disabled
                  className="form-input-academic bg-academic-light text-academic-muted text-sm py-2 px-3"
                />
              </div>

              <div>
                <label className="form-label-academic text-xs mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={profile?.role || ""}
                  disabled
                  className="form-input-academic bg-academic-light text-academic-muted capitalize text-sm py-2 px-3"
                />
              </div>

              <div>
                <label className="form-label-academic text-xs mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!editing}
                  className={`form-input-academic text-sm py-2 px-3 ${
                    editing ? "bg-academic-white text-academic-text" : "bg-academic-light text-academic-muted"
                  }`}
                />
              </div>

              <div>
                <label className="form-label-academic text-xs mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!editing}
                  className={`form-input-academic text-sm py-2 px-3 ${
                    editing ? "bg-academic-white text-academic-text" : "bg-academic-light text-academic-muted"
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label-academic text-xs mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                  className={`form-input-academic text-sm py-2 px-3 ${
                    editing ? "bg-academic-white text-academic-text" : "bg-academic-light text-academic-muted"
                  }`}
                />
              </div>
            </div>

            {editing && (
              <div className="flex justify-end space-x-3 pt-3 border-t border-academic-border">
                <button
                  onClick={() => setEditing(false)}
                  className="btn-academic-secondary py-1.5 px-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-academic py-1.5 px-3 text-sm"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;