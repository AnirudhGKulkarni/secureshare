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
  { name: 'Messages', href: '/client/messages', icon: MessageSquare },
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

export const ClientSidebar = () => {
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

      <div className="p-4 border-t border-border">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border">
          <p className="text-xs font-semibold text-foreground">Need Help?</p>
          <p className="text-xs text-muted-foreground mt-1">Contact support anytime</p>
          <button className="mt-2 text-xs text-blue-600 hover:underline">Get Support</button>
        </div>
      </div>

      {/* Recent Activity Mini-Cards Section */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3 justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          {recentActivities.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{recentActivities.length}</span>
          )}
        </div>

        <div className="relative group">
          <div
            ref={activityRef}
            className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="inline-flex flex-col w-40 min-w-[10rem] p-2.5 rounded-lg border bg-gradient-to-br from-secondary/30 to-secondary/10 hover:border-primary/30 hover:shadow-sm transition-all"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="text-xs font-semibold text-foreground truncate">{activity.action}</div>
                  {activity.resource && <div className="text-xs text-muted-foreground mt-1 truncate">{activity.resource}</div>}
                  <div className="text-xs text-muted-foreground mt-2 font-medium">{getRelativeTime(activity.timestamp)}</div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground p-3 w-full text-center">No activity yet</div>
            )}
          </div>

          {/* Right-side scroll button - visible when there's content */}
          {recentActivities.length > 0 && (
            <button
              aria-label="Scroll activity right"
              onClick={() => {
                const el = activityRef.current;
                if (!el) return;
                const amount = Math.floor(el.clientWidth * 0.8) || 160;
                el.scrollBy({ left: amount, behavior: 'smooth' });
              }}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-primary/20 rounded-full p-1.5 shadow-md hover:bg-primary/5 hover:border-primary/50 transition-all ${
                canScrollRight ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <ChevronRight className="h-4 w-4 text-primary" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
