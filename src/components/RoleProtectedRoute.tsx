// src/components/RoleProtectedRoute.tsx
import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RoleProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: "admin" | "client" | "super_admin"; allowPending?: boolean; pendingOnly?: boolean }> = ({ children, requiredRole, allowPending = false, pendingOnly = false }) => {
  const { currentUser, loading, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastRedirectRef = useRef<string | null>(null);

  // Determine redirect target based on current auth/profile state. Pure function — no hooks inside.
  const computeRedirect = (cu: any, pr: any): string | null => {
    if (!cu) return "/login";
    if (!pr) return "/login";

    const roleRaw = pr.role;
    const role = roleRaw === "superadmin" ? "super_admin" : roleRaw;

    // Check if user has submitted an admin request and is waiting for approval
    if (pr?.adminRequestSubmitted === true && role !== "admin") {
      // They submitted an admin request but haven't been approved yet
      // Redirect to waiting approval page (regardless of what route they're trying to access)
      return "/waiting-approval";
    }

    const status = pr?.status || "active";
    const isPending = status === "pending" || pr?.approved === false;

    if (pendingOnly) {
      if (isPending) return null;
      return role === "super_admin" ? "/super-admin" : role === "admin" ? "/dashboard" : "/client";
    }

    if (requiredRole === "admin" && pr.role === "admin") {
      const isActive = pr.status === "active";
      const isPaid = !!pr.paid;
      if (isActive && !isPaid) return "/pricing";
    }

    // Allow super_admin users to access admin-level routes
    if (requiredRole === 'admin' && role === 'super_admin') return null;

    if (role !== requiredRole) return role === "super_admin" ? "/super-admin" : role === "admin" ? "/dashboard" : "/client";

    return null;
  };

  useEffect(() => {
    if (loading) return;
    // If the auth user exists but the profile is still loading (undefined), wait for profile to resolve
    if (currentUser && profile === undefined) return;

    const target = computeRedirect(currentUser, profile);
    if (!target) return;
    if (location.pathname === target) return;
    if (lastRedirectRef.current === target) return;
    lastRedirectRef.current = target;
    navigate(target, { replace: true });
  }, [loading, currentUser, profile, location.pathname, navigate, requiredRole, allowPending, pendingOnly]);

  // While loading, keep showing nothing. After loading, only render children when user/profile are present and allowed.
  if (loading) return null;
  if (!currentUser) return null;
  if (!profile) return null;

  const finalTarget = computeRedirect(currentUser, profile);
  if (finalTarget && location.pathname !== finalTarget) return null;

  return <>{children}</>;
};
