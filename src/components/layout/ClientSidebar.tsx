import { NavLink } from 'react-router-dom';
import { 
  Home,
  FolderOpen,
  Upload,
  MessageSquare,
  History,
  BellDot,
  Lock,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/client-dashboard', icon: Home },
  { name: 'My Files', href: '/client/files', icon: FolderOpen },
  { name: 'Share Files', href: '/share', icon: Upload },
  { name: 'Messages', href: '/chat', icon: MessageSquare },
  { name: 'Activity', href: '/login-history', icon: History },
  { name: 'Notifications', href: '/alert-center', icon: BellDot },
  { name: 'Security', href: '/security-settings', icon: Lock },
  { name: 'Profile', href: '/client/profile', icon: UserCircle },
];

export const ClientSidebar = () => {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-gradient-to-b from-card to-secondary/20 border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FolderOpen className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">trustNshare</span>
            <span className="text-[10px] text-muted-foreground">Client Portal</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border">
          <p className="text-xs font-semibold text-foreground">Need Help?</p>
          <p className="text-xs text-muted-foreground mt-1">Contact support anytime</p>
          <button className="mt-2 text-xs text-blue-600 hover:underline">Get Support</button>
        </div>
      </div>
    </aside>
  );
};
