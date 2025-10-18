// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: string | string[];
  currentRole?: string;
}

export default function ProtectedRoute({ children, allowedRole, currentRole }: ProtectedRouteProps) {
  if (!currentRole) {
    return <Navigate to="/" replace />;
  }

  // Normalize allowedRole to an array for consistent handling
  const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  
  // Check if current role is in the allowed roles array
  if (!allowedRoles.map(role => role.toLowerCase()).includes(currentRole.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}