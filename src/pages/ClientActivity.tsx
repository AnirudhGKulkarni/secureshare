import React, { useEffect, useState } from 'react';
// Rendered within the `/client` parent route which provides the layout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface ActivityItem {
  id: string;
  action: string;
  resource?: string;
  details?: string;
  timestamp?: any;
}

const getRelativeTime = (ts: any) => {
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

const ClientActivity: React.FC = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const logsRef = collection(firestore, 'audit_logs');
    const q = query(logsRef, where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const out: ActivityItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        out.push({ id: d.id, action: data.action ?? 'Activity', resource: data.resource, details: data.details, timestamp: data.timestamp ?? data.createdAt });
      });
      setItems(out);
    }, (err) => {
      console.error('Activity subscribe error', err);
      setItems([]);
    });
    return () => unsub();
  }, [currentUser]);

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">Your recent actions and audit trail</p>
      </div>

      <Card className="max-h-[68vh] overflow-auto">
        <CardHeader>
          {/* <CardTitle>Activity</CardTitle> */}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
            {items.map((it) => (
              <div key={it.id} className="p-3 rounded-md border bg-secondary/20 flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{it.action}{it.resource ? ` — ${it.resource}` : ''}</div>
                  {it.details && <div className="text-xs text-muted-foreground mt-1">{it.details}</div>}
                </div>
                <div className="flex items-center gap-3">
                  {/* Show view button for non-login uploads/downloads/updates */}
                  {/login/i.test(it.action) ? null : /upload|uploaded|download|downloaded|update|updated|edit|modified|image/i.test(it.action) ? (
                    <button
                      aria-label={`View details for ${it.action}`}
                      title="View details"
                      onClick={() => { setSelected(it); setDialogOpen(true); }}
                      className="p-1 rounded hover:bg-primary/10 text-blue-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : null}

                  <div className="text-xs text-muted-foreground">{getRelativeTime(it.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        </Card>

        {/* Detail dialog for viewable activities */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setSelected(null); setDialogOpen(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activity details</DialogTitle>
              <DialogDescription>{selected?.action}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selected?.resource && (
                <div>
                  <div className="text-sm font-medium mb-2">Resource</div>
                  {/* If resource looks like an image URL, show preview */}
                  {/\.(jpe?g|png|gif|webp|svg)$/i.test(String(selected.resource)) ? (
                    <img src={String(selected.resource)} alt="activity resource" className="max-w-full max-h-[50vh] object-contain rounded" />
                  ) : (
                    <div className="text-sm text-muted-foreground break-all">{String(selected.resource)}</div>
                  )}
                </div>
              )}

              {selected?.details && (
                <div>
                  <div className="text-sm font-medium mb-2">Details</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{String(selected.details)}</div>
                </div>
              )}

              {!selected?.resource && !selected?.details && (
                <div className="text-sm text-muted-foreground">No additional details available.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default ClientActivity;
