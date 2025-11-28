// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Policies from "./pages/Policies";
import Share from "./pages/Share";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import ClientProfile from "./pages/ClientProfile";
import ClientSettings from "./pages/ClientSettings";
// add near your imports in src/App.tsx
import React from "react";
import ClientShare from "./pages/ClientShare";


const HomeRedirect: React.FC = () => {
  const { currentUser, profile, loading } = useAuth();

  // while auth is resolving show nothing (or a spinner)
  if (loading) return <div className="flex h-screen items-center justify-center">Checking session...</div>;

  if (!currentUser) return <Navigate to="/login" replace />;

  // if profile exists and role is client -> client page, else admin dashboard
  if (profile?.role === "client") return <Navigate to="/client" replace />;
  return <Navigate to="/dashboard" replace />;
};



const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

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



            <Route path="/" element={<HomeRedirect />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
