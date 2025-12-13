import { NavLink } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { 
  Home,
  FolderOpen,
  Upload,
  MessageSquare,
  History,
  Lock,
  UserCircle,
  ChevronRight,
  Activity as ActivityIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

const navigation = [
  { name: 'Dashboard', href: '/client', icon: Home, end: true },
  { name: 'Share Files', href: '/client/share', icon: Upload },
  { name: 'Policies', href: '/client/policies', icon: FolderOpen },
  { name: 'Chat', href: '/client/messages', icon: MessageSquare },
  { name: 'Activity', href: '/client/activity', icon: History },
  { name: 'Security', href: '/client/security', icon: Lock },
  { name: 'Profile', href: '/client/profile', icon: UserCircle },
];

interface ActivityItem {
  id: string;
  action: string;
  resource?: string;
  timestamp?: any;
}

const getRelativeTime = (ts: any): string => {
  if (!ts) return 'recently';
  try {
    const t = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const diff = Date.now() - t.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch (e) {
    return 'recently';
  }
};

export const ClientSidebar = ({ mobileOpen = false, onClose }: { mobileOpen?: boolean; onClose?: () => void }) => {
  const { currentUser } = useAuth();
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // Fetch real activity data from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const logsRef = collection(firestore, 'audit_logs');
    const q = query(logsRef, where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(5));
    
    const unsub = onSnapshot(q, (snap) => {
      const out: ActivityItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        out.push({ 
          id: d.id, 
          action: data.action ?? 'Activity', 
          resource: data.resource,
          timestamp: data.timestamp ?? data.createdAt 
        });
      });
      setRecentActivities(out);
    }, (err) => {
      console.error('Activity fetch error:', err);
      setRecentActivities([]);
    });

    return () => unsub();
  }, [currentUser]);

  // Detect horizontal overflow
  useEffect(() => {
    const el = activityRef.current;
    if (!el) {
      setCanScrollRight(false);
      return;
    }

    const update = () => {
      setCanScrollRight(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    update();
    window.addEventListener('resize', update);
    el.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      el.removeEventListener('scroll', update);
    };
  }, [recentActivities]);

  const panel = (
    <div className="flex flex-col w-64 bg-white dark:bg-card border-r border-border h-full">
      <div className="flex h-20 items-center px-0 border-b border-border bg-card">
        <div className="w-full h-20 overflow-hidden">
          <img src="/trustNshare.jpg" alt="trustNshare" className="w-full h-20 object-cover block dark:hidden" />
          <img src="/bg.png" alt="trustNshare dark" className="w-full h-20 object-cover hidden dark:block" />
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={(item as any).end}
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

      {/* Sidebar compacted: support card and recent-activity removed per request */}
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
