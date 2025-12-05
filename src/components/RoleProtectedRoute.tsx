// src/components/RoleProtectedRoute.tsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RoleProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: "admin" | "client" | "super_admin"; allowPending?: boolean; pendingOnly?: boolean }> = ({ children, requiredRole, allowPending = false, pendingOnly = false }) => {
  const { currentUser, loading, profile } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const lastRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000); // 5s fallback
    return () => clearTimeout(t);
  }, []);

  // Avoid showing blocking loading UI; render nothing while auth/profile loads.
  if (loading) return null;
  const status = profile?.status || "active";

  // Decide single redirect target
  const computeRedirect = (): string | null => {
    if (!currentUser) return "/login";
    if (!profile) return "/login";

    // Pending-only routes: allow any role if status is pending
    if (pendingOnly) {
      if (status === "pending") return null; // allow access
      return profile.role === "super_admin" ? "/super-admin" : profile.role === "admin" ? "/dashboard" : "/client";
    }

    // Pending users should only access routes explicitly allowed (e.g., WaitingApproval)
    if (status === "pending" && !allowPending) {
      return "/waiting-approval";
    }

    // Admin unpaid gating
    if (requiredRole === "admin" && profile.role === "admin") {
      const isActive = profile.status === "active";
      const isPaid = !!profile.paid;
      if (isActive && !isPaid) return "/pricing";
    }

    // Role mismatch → own dashboard
    if (profile.role !== requiredRole) {
      return profile.role === "super_admin" ? "/super-admin" : profile.role === "admin" ? "/dashboard" : "/client";
    }

    return null;
  };

  const target = computeRedirect();

  useEffect(() => {
    if (loading) return;
    if (!target) return;
    if (location.pathname === target) return;
    if (lastRedirectRef.current === target) return;
    lastRedirectRef.current = target;
    navigate(target, { replace: true });
  }, [loading, target, location.pathname, navigate]);

  // While redirecting or missing profile/auth, render nothing to avoid flicker/loops
  if (!currentUser) return null;
  if (!profile && !timedOut) return null;
  if (target && location.pathname !== target) return null;

  return <>{children}</>;
};
