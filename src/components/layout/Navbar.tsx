import React, { useEffect, useState } from "react";
import { LogOut, Settings, Sun, Moon, User } from "lucide-react";
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
    <header className="relative z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 w-full min-w-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-md hover:bg-border flex items-center justify-center w-10 h-10">
          <img src="/favicon.ico" alt="menu" className="h-6 w-6 object-contain block dark:hidden" />
          <img src="/favicon2.ico" alt="menu" className="h-6 w-6 object-contain hidden dark:block" />
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

      <div className="flex items-center gap-2 sm:gap-4 ml-auto flex-shrink-0">
        <div className="hidden sm:block">
          {profile?.role !== "client" && (
            <button className="px-3 py-1 rounded-md text-white text-sm font-medium hover:opacity-95" style={{ backgroundColor: '#113738' }}>Connect to Hardware</button>
          )}
        </div>

        {/* Theme toggle moved to right side */}
        <button
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-md hover:bg-border flex-shrink-0 inline-flex"
        >
          {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-1 rounded-md hover:bg-border flex-shrink-0 inline-flex">
              <User className="md:hidden h-5 w-5 text-foreground flex-shrink-0" />
              <span className="hidden md:inline text-sm font-medium text-foreground">{displayName}</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 z-50">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => {
              if (profile?.role === 'client') {
                navigate('/client/profile');
              } else {
                navigate('/settings');
              }
            }}>
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
