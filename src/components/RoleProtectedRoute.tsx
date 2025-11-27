// src/components/RoleProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RoleProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: "admin" | "client" }> = ({ children, requiredRole }) => {
  const { currentUser, loading, profile } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Checking session...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!profile) return <div className="flex h-screen items-center justify-center">Loading profile...</div>;
  if (profile.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
