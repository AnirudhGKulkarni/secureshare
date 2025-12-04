// src/App.tsx
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

// pages
import Login from "./pages/Login";
import Signup from "./pages/signup";
import AdminSignup from "./pages/adminSignup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Policies from "./pages/Policies";
import Share from "./pages/Share";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfile from "./pages/ClientProfile";
import ClientSettings from "./pages/ClientSettings";
import ClientShare from "./pages/ClientShare";
import NotFound from "./pages/NotFound";
import FrontPage from "./pages/FrontPage";
import Pricing from "./pages/Pricing";
import JustPricing from "./pages/justpricing";
import adminSignup from "./pages/adminSignup";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminApproval from "./pages/AdminApproval";
import EnhancedAuditLogs from "./pages/EnhancedAuditLogs";

// components
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";

const queryClient = new QueryClient();

// ------------------------
// Home Redirect Logic
// ------------------------
const HomeRedirect: React.FC = () => {
  const { currentUser, profile, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    // Add console log for debugging
    console.log("HomeRedirect - Profile:", profile);

    if (profile?.role === "super_admin") {
      console.log("Redirecting to super admin dashboard");
      navigate("/super-admin", { replace: true });
      return;
    }

    if (profile?.role === "admin") {
      console.log("Redirecting to admin dashboard");
      navigate("/dashboard", { replace: true });
      return;
    }

    if (profile?.role === "client") {
      console.log("Redirecting to client dashboard");
      navigate("/client", { replace: true });
      return;
    }

    // fallback → check token claims
    (async () => {
      try {
        const token = await getIdTokenResult(auth.currentUser!);
        console.log("HomeRedirect - Token claims:", token.claims);
        if ((token.claims as any)?.super_admin) {
          console.log("Token claims: super_admin found");
          navigate("/super-admin", { replace: true });
        } else if ((token.claims as any)?.admin) {
          console.log("Token claims: admin found");
          navigate("/dashboard", { replace: true });
        } else {
          console.log("Token claims: defaulting to client");
          navigate("/client", { replace: true });
        }
      } catch (err) {
        console.warn("Token error:", err);
        navigate("/client", { replace: true });
      }
    })();
  }, [currentUser, profile, loading, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      Checking session...
    </div>
  );
};

// ------------------------
// Protected Route Wrapper
// ------------------------
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking session...</div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

// ------------------------
// Main App Component
// ------------------------
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    // Scroll to top on every path change (navbar route clicks)
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <ScrollToTop />
          <Routes>

            {/* ⭐ PUBLIC FRONT PAGE ⭐ */}
            <Route path="/" element={<FrontPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/justpricing" element={<JustPricing />} />

            {/* Auth pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/admin-signup" element={<AdminSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Admin routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/policies"
              element={
                <ProtectedRoute>
                  <Policies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/share"
              element={
                <ProtectedRoute>
                  <Share />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <Audit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Super Admin routes */}
            <Route
              path="/super-admin"
              element={
                <RoleProtectedRoute requiredRole="super_admin">
                  <SuperAdminDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/super-admin/approvals"
              element={
                <RoleProtectedRoute requiredRole="super_admin">
                  <AdminApproval />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/super-admin/audit"
              element={
                <RoleProtectedRoute requiredRole="super_admin">
                  <EnhancedAuditLogs />
                </RoleProtectedRoute>
              }
            />

            {/* Client routes */}
            <Route
              path="/client"
              element={
                <RoleProtectedRoute requiredRole="client">
                  <ClientDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/client/profile"
              element={
                <RoleProtectedRoute requiredRole="client">
                  <ClientProfile />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/client/settings"
              element={
                <RoleProtectedRoute requiredRole="client">
                  <ClientSettings />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/client/share"
              element={
                <RoleProtectedRoute requiredRole="client">
                  <ClientShare />
                </RoleProtectedRoute>
              }
            />

            {/* auto redirect */}
            <Route path="/home-redirect" element={<HomeRedirect />} />

            {/* fallback */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
