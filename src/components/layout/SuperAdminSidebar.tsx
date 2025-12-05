import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  FileText, 
  CheckSquare,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { name: 'Admin Approvals', href: '/super-admin/approvals', icon: CheckSquare },
  { name: 'Audit Logs', href: '/super-admin/audit', icon: FileText },
  { name: 'All Users', href: '/super-admin/users', icon: Users },
];

export const SuperAdminSidebar = () => {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Shield className="h-6 w-6 text-purple-600 mr-2" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
            trustNshare
          </span>
          <span className="text-xs text-purple-600 font-medium">Super Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            // Ensure only the exact route is highlighted. Without `end`,
            // "/super-admin" stays active for subpaths like "/super-admin/approvals".
            end={item.href === '/super-admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
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
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-purple-900">Super Admin</p>
          <p className="text-xs text-purple-700 mt-1">Full system access</p>
        </div>
      </div>
    </aside>
  );
};
