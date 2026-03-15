import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  FileText, 
  CheckSquare,
  Users,
  Settings as SettingsIcon,
  Share2,
  MessageSquare,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { name: 'Admin Approvals', href: '/super-admin/approvals', icon: CheckSquare },
  { name: 'User Management', href: '/super-admin/user-management', icon: Users },
  { name: 'Shared Data', href: '/super-admin/shared-data', icon: Share2 },
  { name: 'Admin Chat', href: '/super-admin/admin-chat', icon: MessageSquare },
  { name: 'Login History', href: '/super-admin/login-history', icon: History },
  { name: 'Audit Logs', href: '/super-admin/audit', icon: FileText },
  { name: 'All Users', href: '/super-admin/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export const SuperAdminSidebar = ({ mobileOpen = false, onClose }: { mobileOpen?: boolean; onClose?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const panel = (
    <div className="flex flex-col h-full">
      <div className="w-full">
        <div className="h-20 border-b border-border flex items-center bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900">
          <div className="w-full h-20 flex items-center justify-center px-2">
            {/* Logo: Show full logo on mobile, compact on desktop collapsed state */}
            <div className="flex items-center justify-center w-full h-full relative">
              {/* Compact favicon (desktop only, hidden on mobile) */}
              <div className="hidden lg:flex items-center justify-center w-14 h-14 flex-shrink-0 z-10 group-hover:hidden">
                <img src="/favicon.ico" alt="favicon-light" className="h-9 w-9 object-contain block dark:hidden" />
                <img src="/favicon2.ico" alt="favicon-dark" className="h-9 w-9 object-contain hidden dark:block" />
              </div>

              {/* Full logo (visible on mobile and on desktop hover) */}
              <div className="hidden lg:flex lg:opacity-0 opacity-100 lg:group-hover:flex lg:group-hover:opacity-100 transition-opacity duration-200 items-center justify-center">
                <img src="/lbg.png" alt="trustNshare light" className="max-h-16 max-w-full object-contain block dark:hidden" />
                <img src="/bg.png" alt="trustNshare dark" className="max-h-16 max-w-full object-contain hidden dark:block" />
              </div>

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center">
                <img src="/lbg.png" alt="trustNshare light" className="max-h-16 max-w-full object-contain block dark:hidden" />
                <img src="/bg.png" alt="trustNshare dark" className="max-h-16 max-w-full object-contain hidden dark:block" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/super-admin'}
            className={({ isActive }) =>
              cn(
                // center icons when collapsed on desktop, align left on mobile and hover
                'flex items-center gap-3 transition-all duration-200 rounded-md',
                'lg:justify-center lg:group-hover:justify-start justify-start',
                'px-2 lg:px-1 lg:group-hover:px-3',
                'py-2.5 text-sm font-medium',
                'hover:bg-teal-100/50 dark:hover:bg-teal-900/30',
                isActive ? 'lg:group-hover:bg-teal-600 lg:group-hover:text-white bg-teal-600 text-white' : 'text-foreground/70 dark:text-foreground/80 hover:text-foreground'
              )
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon className={cn(
                  'h-5 w-5 flex-shrink-0 transition-all',
                  isActive ? 'text-white' : 'text-foreground/70 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                )} />
                <span className="overflow-hidden lg:max-w-0 lg:opacity-0 max-w-xs opacity-100 group-hover:max-w-xs group-hover:opacity-100 transition-[max-width,opacity] duration-200 whitespace-nowrap font-bold text-foreground dark:text-foreground">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-secondary rounded-lg p-3 border">
          <p className="text-xs font-semibold">Super Admin</p>
          <p className="text-xs text-muted-foreground mt-1">Full system access</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`fixed inset-0 bg-black transition-opacity ${mobileOpen ? 'opacity-60' : 'opacity-0'}`}
          onClick={onClose}
        />

        <div className={`fixed left-0 top-0 bottom-0 w-64 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} bg-card border-r border-border`}>
          {panel}
        </div>
      </div>

      <div className="hidden lg:block group">
        <aside
          onMouseEnter={() => {
            try {
              if (videoRef.current) videoRef.current.play().catch(() => {});
            } catch (e) {}
          }}
          onMouseLeave={() => {
            try {
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
              }
            } catch (e) {}
          }}
          className="flex flex-col h-full w-16 group-hover:w-64 transition-[width] duration-200 ease-linear bg-gradient-to-b from-teal-50 to-cyan-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 group-hover:bg-card border-r-2 border-teal-200 dark:border-teal-700 group-hover:border-border overflow-hidden z-20 group-hover:z-40"
          style={{ willChange: 'width' }}
        >
          {panel}
        </aside>
      </div>
    </>
  );
};
