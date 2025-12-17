import React, { useEffect, useState } from "react";
import { LogOut, Settings, Sun, Moon } from "lucide-react";
// avatar removed by user request
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const { currentUser, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // ignore in SSR or restricted env
    }
  }, [isDark]);

  const displayName =
    profile?.name ||
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : undefined) ||
    currentUser?.displayName ||
    "User";

  const email = profile?.email || currentUser?.email || "";

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const prettyRole = (r?: string) => {
    if (!r) return "User";
    if (r === "super_admin") return "Super Admin";
    if (r === "admin") return "Admin";
    if (r === "client") return "Client";
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-md hover:bg-border">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
          </svg>
        </button>
          {profile && ["super_admin", "admin", "client"].includes(profile.role) ? (
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-foreground">trustNshare</h1>
              <span className="text-sm text-muted-foreground">{prettyRole(profile.role)}</span>
            </div>
          ) : (
            <>
              <div className="h-8 w-8 rounded-md overflow-hidden">
                <img src="/lbg.png" alt="trustNshare light" className="w-8 h-8 object-cover block dark:hidden" />
                <img src="/bg.png" alt="trustNshare dark" className="w-8 h-8 object-cover hidden dark:block" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">trustNshare</h1>
            </>
          )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          {profile?.role !== "client" && (
            <button className="px-3 py-1 rounded-md bg-blue-700 text-white text-sm font-medium hover:opacity-95">Connect to Hardware</button>
          )}
        </div>

        {/* Theme toggle moved to right side */}
        <button
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-md hover:bg-border"
        >
          {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-1 rounded-md hover:bg-border">
              <span className="hidden md:block text-sm font-medium text-foreground">{displayName}</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/settings") }>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
