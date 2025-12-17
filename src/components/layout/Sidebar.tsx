import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Share2, 
  FileText, 
  Settings,
  MessageCircle,
  Clock,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users & Roles', href: '/users', icon: Users },
  { name: 'Policies', href: '/policies', icon: Shield },
  { name: 'Share Data', href: '/share', icon: Share2 },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Login History', href: '/login-history', icon: Clock },
  { name: 'Alert Center', href: '/alert-center', icon: Bell },
  { name: 'Security Settings', href: '/security-settings', icon: ShieldCheck },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = ({ mobileOpen = false, onClose }: { mobileOpen?: boolean; onClose?: () => void }) => {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';

  const filteredNavigation = navigation.filter((item) => {
    // hide any security-related nav items for client users
    if (isClient && item.name.toLowerCase().includes('security')) return false;
    return true;
  });

  const panel = (
    <div className="flex flex-col w-64 h-full bg-card border-r border-border">
      <div className="flex h-20 items-center px-0 border-b border-border">
        <div className="w-full h-20 overflow-hidden">
          <img src="/lbg.png" alt="trustNshare light" className="w-full h-20 object-cover block dark:hidden" />
          <img src="/bg.png" alt="trustNshare dark" className="w-full h-20 object-cover hidden dark:block" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`fixed inset-0 bg-black transition-opacity ${mobileOpen ? 'opacity-60' : 'opacity-0'}`}
          onClick={onClose}
        />

        <div className={`fixed left-0 top-0 bottom-0 w-64 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {panel}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64">{panel}</aside>
    </>
  );
};
