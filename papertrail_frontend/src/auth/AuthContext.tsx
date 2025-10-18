// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, fetchProfile } from "../services/api";
import { useNavigate } from "react-router-dom";

type Role = "Student" | "Admin" | "Adviser" | "Panel";

interface User {
  id?: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  student_id?: string;
  department?: string;
  access: string;
  refresh: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Load user from localStorage when app starts
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Refresh user data from backend to ensure it's current
        refreshUserData();
      } catch (e) {
        console.error("Failed to parse stored user data:", e);
        logout();
      }
    }
  }, []);

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem("access");
      if (token) {
        // Try to fetch fresh user data from backend
        const userData = await fetchProfile();
        const updatedUser = {
          ...userData,
          access: localStorage.getItem("access") || "",
          refresh: localStorage.getItem("refresh") || ""
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      // If refresh fails, check if token is expired
      const token = localStorage.getItem("access");
      if (!token) {
        logout();
      }
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const userData = await apiLogin(username, password);

      // Save in state + localStorage
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("access", userData.access);
      localStorage.setItem("refresh", userData.refresh);
      localStorage.setItem("role", userData.role);
      
      // Redirect to role-specific dashboard
      switch (userData.role) {
        case "Student":
          navigate("/dashboard/student");
          break;
        case "Admin":
          navigate("/dashboard/admin");
          break;
        case "Adviser":
          navigate("/dashboard/adviser");
          break;
        case "Panel":
          navigate("/dashboard/panel");
          break;
        default:
          navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    // Clear everything
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    
    // Navigate to login page
    navigate("/login");
  };

  const refreshUser = async () => {
    await refreshUserData();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};