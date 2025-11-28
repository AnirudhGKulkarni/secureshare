// src/components/RoleProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RoleProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: "admin" | "client" }> = ({ children, requiredRole }) => {
  const { currentUser, loading, profile } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000); // 5s fallback
    return () => clearTimeout(t);
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Checking session...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!profile && !timedOut) return <div className="flex h-screen items-center justify-center">Loading profile...</div>;
  if (!profile && timedOut) return <Navigate to="/dashboard" replace />;
  if (profile.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
