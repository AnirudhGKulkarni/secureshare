// src/pages/ClientDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Settings, User, Activity, FileText, Shield, MessageSquare, Clock, Bell, Lock, ArrowUp, Upload, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type SensitivityBucket = "public" | "internal" | "confidential";

interface FileSensitivityChartDatum {
  key: SensitivityBucket;
  name: string;
  color: string;
  value: number;
}

interface LoginActivityDatum {
  day: string;
  dateKey: string;
  logins: number;
}

const SENSITIVITY_ORDER: SensitivityBucket[] = ["public", "internal", "confidential"];

const SENSITIVITY_CONFIG: Record<SensitivityBucket, { name: string; color: string }> = {
  public: { name: "Public", color: "#22c55e" },
  internal: { name: "Internal", color: "#3b82f6" },
  confidential: { name: "Confidential", color: "#ef4444" },
};

const buildEmptySensitivityData = (): FileSensitivityChartDatum[] =>
  SENSITIVITY_ORDER.map((bucket) => ({
    key: bucket,
    name: SENSITIVITY_CONFIG[bucket].name,
    color: SENSITIVITY_CONFIG[bucket].color,
    value: 0,
  }));

const normalizeSensitivity = (raw: unknown): SensitivityBucket => {
  if (typeof raw === "string") {
    const value = raw.toLowerCase();
    if (value.includes("public") || value.includes("low")) return "public";
    if (value.includes("confid") || value.includes("secret") || value.includes("sensitive") || value.includes("high")) {
      return "confidential";
    }
    if (value.includes("internal") || value.includes("medium") || value.includes("restrict") || value.includes("private")) {
      return "internal";
    }
  }

  if (typeof raw === "number") {
    if (raw >= 3) return "confidential";
    if (raw >= 2) return "internal";
    return "public";
  }

  return "internal";
};

const coerceTimestampToDate = (value: any): Date | null => {
  if (!value) return null;

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      try {
        return value.toDate();
      } catch (_err) {
        /* ignore conversion issue and fall through */
      }
    }

    if ("seconds" in value) {
      const seconds = Number((value as { seconds: number }).seconds ?? 0);
      const nanoseconds = Number((value as { nanoseconds?: number }).nanoseconds ?? 0);
      return new Date(seconds * 1000 + nanoseconds / 1e6);
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildLastSevenDayBuckets = (): LoginActivityDatum[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

  return Array.from({ length: 7 }).map((_, idx) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - (6 - idx));
    return {
      day: formatter.format(dayDate),
      dateKey: dayDate.toISOString().slice(0, 10),
      logins: 0,
    };
  });
};

interface Alert {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'error' | 'success';
  createdAt: any;
  userId?: string;
}

interface RecentActivityItem {
  id: string;
  action: string;
  resource?: string;
  details?: string;
  timestamp: any;
  icon?: string;
}

const getRelativeTime = (timestamp: any): string => {
  const date = coerceTimestampToDate(timestamp);
  if (!date) return 'recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

const getActivityIcon = (action: string): any => {
  const normalized = action.toUpperCase();
  if (normalized.includes('FILE') || normalized.includes('UPLOAD') || normalized.includes('DOWNLOAD')) return FileText;
  if (normalized.includes('SECURITY') || normalized.includes('LOGIN') || normalized.includes('AUTH')) return Shield;
  if (normalized.includes('SHARE')) return Upload;
  if (normalized.includes('MESSAGE') || normalized.includes('CHAT')) return MessageSquare;
  if (normalized.includes('SETTINGS') || normalized.includes('UPDATE')) return Settings;
  return Activity;
};

const ClientDashboard: React.FC = () => {
  const { currentUser, profile, loading, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [localProfile, setLocalProfile] = useState<any>(profile ?? {});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fileSensitivityData, setFileSensitivityData] = useState<FileSensitivityChartDatum[]>(() => buildEmptySensitivityData());
  const [loginActivityData, setLoginActivityData] = useState<LoginActivityDatum[]>(() => buildLastSevenDayBuckets());
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setLocalProfile(profile ?? {});
  }, [profile]);

  // Try to get freshest profile once mounted
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setIsLoadingProfile(true);
      try {
        const snap = await getDoc(doc(firestore, "users", currentUser.uid));
        if (snap.exists()) setLocalProfile(snap.data());
      } catch (err) {
        console.warn("Could not load fresh profile:", err);
        // Leave localProfile as-is so UI falls back to auth info when Firestore is restricted.
      } finally {
        setIsLoadingProfile(false);
      }
    };
    load();
  }, [currentUser]);

  // scroll helpers removed — UI simplified to show a small fixed set of activity items.

  // Real-time alerts subscription
  useEffect(() => {
    if (!currentUser) return;

    const alertsRef = collection(firestore, 'alerts');
    const q = query(
      alertsRef,
      where('userId', 'in', [currentUser.uid, 'all']),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData: Alert[] = [];
      snapshot.forEach((doc) => {
        alertsData.push({
          id: doc.id,
          ...doc.data()
        } as Alert);
      });
      setAlerts(alertsData);
    }, (error) => {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Track file sensitivity distribution in real time
  useEffect(() => {
    if (!currentUser) return;

    const sharedDataRef = collection(firestore, "shared_data");
    const unsubscribe = onSnapshot(
      sharedDataRef,
      (snapshot) => {
        const counts: Record<SensitivityBucket, number> = {
          public: 0,
          internal: 0,
          confidential: 0,
        };

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;

          const ownerId =
            typeof data.ownerId === "string"
              ? data.ownerId
              : typeof data.userId === "string"
              ? data.userId
              : undefined;

          // sharedWith is an array of objects like { userId: "..." }
          const sharedWithArray: { userId?: string }[] = Array.isArray(
            data.sharedWith
          )
            ? data.sharedWith
            : [];

          const isOwner = ownerId === currentUser.uid;
          const isExplicitlyShared = sharedWithArray.some(
            (entry) => entry.userId === currentUser.uid
          );

          // Only count docs the current user should see
          if (!isOwner && !isExplicitlyShared) {
            return;
          }

          const bucket = normalizeSensitivity(
            data.sensitivity ??
              data.classification ??
              data.confidentiality ??
              data.securityLevel ??
              data.sensitivityLevel ??
              data.level ??
              data.risk ??
              data.category
          );

          counts[bucket] = (counts[bucket] ?? 0) + 1;
        });

        setFileSensitivityData(
          SENSITIVITY_ORDER.map((bucket) => ({
            key: bucket,
            name: SENSITIVITY_CONFIG[bucket].name,
            color: SENSITIVITY_CONFIG[bucket].color,
            value: counts[bucket] ?? 0,
          }))
        );
      },
      (error) => {
        console.error("Error fetching file sensitivity data:", error);
        setFileSensitivityData(buildEmptySensitivityData());
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Track login activity for the last seven days
  useEffect(() => {
    if (!currentUser) return;

    const logsQuery = query(collection(firestore, 'audit_logs'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const buckets = buildLastSevenDayBuckets();
      const totals = buckets.reduce<Record<string, number>>((acc, bucket) => {
        acc[bucket.dateKey] = 0;
        return acc;
      }, {});

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const actionRaw = data.action;
        const normalizedAction = typeof actionRaw === 'string' ? actionRaw.toUpperCase() : '';

        // broaden detection to capture variations like 'SIGNED IN', 'SIGNIN', 'AUTH', 'SESSION', 'START', etc.
        const isLoginEvent = (
          normalizedAction.includes('LOGIN') ||
          normalizedAction.includes('LOG IN') ||
          normalizedAction.includes('SIGNED') ||
          normalizedAction.includes('SIGNIN') ||
          normalizedAction.includes('SIGN') ||
          normalizedAction.includes('AUTH') ||
          normalizedAction.includes('AUTHENTICATED') ||
          normalizedAction.includes('AUTHORIZED') ||
          normalizedAction.includes('SESSION') ||
          normalizedAction.includes('START')
        );

        if (!isLoginEvent) return;

        const eventDate = coerceTimestampToDate(data.timestamp ?? data.createdAt ?? data.time ?? data.ts);
        if (!eventDate) return;

        eventDate.setHours(0, 0, 0, 0);
        const key = eventDate.toISOString().slice(0, 10);
        if (key in totals) {
          totals[key] += 1;
        }
      });

      setLoginActivityData(
        buckets.map((bucket) => ({
          ...bucket,
          logins: totals[bucket.dateKey] ?? 0,
        }))
      );
    }, (error) => {
      console.error('Error fetching login activity:', error);
      setLoginActivityData(buildLastSevenDayBuckets());
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Track recent activity (all actions, not limited)
  useEffect(() => {
    if (!currentUser) return;

    const logsQuery = query(
      collection(firestore, 'audit_logs'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const activities: RecentActivityItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        activities.push({
          id: docSnap.id,
          action: (data.action as string) ?? 'Activity',
          resource: data.resource as string | undefined,
          details: data.details as string | undefined,
          timestamp: data.timestamp ?? data.createdAt ?? data.time,
        });
      });
      setRecentActivity(activities);
    }, (error) => {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Update scroll button visibility
  useEffect(() => {
    const updateScrollButtons = () => {
      if (activityScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = activityScrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
      }
    };

    const el = activityScrollRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);

      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [recentActivity]);

  const scrollActivity = (direction: 'left' | 'right') => {
    if (activityScrollRef.current) {
      const scrollAmount = 300;
      activityScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err: any) {
      console.error("Logout failed:", err);
      toast.error("Logout failed. Try again.");
    }
  };

  const openEdit = () => setIsEditing(true);
  const closeEdit = () => setIsEditing(false);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser || !localProfile) return;
    setIsSaving(true);
    try {
      const uid = currentUser.uid;
      const { firstName = "", lastName = "", company = null, companyDomain = null, domain = "Other" } = localProfile;
      await setDoc(doc(firestore, "users", uid), { firstName, lastName, company, companyDomain, domain }, { merge: true });
      toast.success("Profile updated");
      await refreshProfile();
      setIsEditing(false);
    } catch (err: any) {
      console.error("Profile save error:", err);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // guard loading / auth
  if (loading) return null;
  if (!currentUser) return <div className="flex h-screen items-center justify-center">Not signed in</div>;

  // derive display values safely
  const displayName = (localProfile?.firstName ? `${localProfile.firstName}${localProfile?.lastName ? ` ${localProfile.lastName}` : ""}` : "")
    || localProfile?.email
    || currentUser.displayName
    || currentUser.email?.split?.("@")?.[0]
    || "Client";

  const email = localProfile?.email ?? currentUser.email ?? "";
  const domain = localProfile?.domain ?? "—";
  const role = localProfile?.role ?? "client";

  // role-aware navigation helpers (keeps client isolated from admin)
  const goToSettings = () => navigate("/client/settings");
  const goToProfile = () => navigate("/client/profile");

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'info': 
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getAlertDotColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'success': return 'bg-green-500';
      case 'info': 
      default: return 'bg-blue-500';
    }
  };

  const hasFileSensitivityData = fileSensitivityData.some((item) => item.value > 0);
  const hasLoginActivity = loginActivityData.some((item) => item.logins > 0);

  return (
      <>
      {/* MAIN CONTENT within ClientLayout sidebar */}
      <div className="flex-1 flex flex-col">
        {/* MAIN NAVBAR is provided globally; page-level duplicate removed */}

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-6 overflow-auto bg-background">
        <div className="max-w-6xl mx-auto">
          {/* Main area */}
          <div className="space-y-6">
            <Card className="border-0 shadow-md bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Welcome, {localProfile?.firstName ?? localProfile?.username ?? "Client"}!</CardTitle>
                <CardDescription className="text-muted-foreground dark:text-slate-400 text-base">Overview of your account and quick actions.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-2">
                {/* Recent Activity (mini cards with horizontal scroll) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-foreground/70" />
                    <h3 className="font-semibold text-lg text-foreground">Recent Activity</h3>
                  </div>

                  <div className="relative">
                    <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;} .hide-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}`}</style>
                    <div className="flex items-center gap-2">
                      {/* Left scroll button */}
                      <button
                        onClick={() => scrollActivity('left')}
                        disabled={!canScrollLeft}
                        className="flex-shrink-0 p-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Scroll left"
                      >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>

                      {/* Activity cards container */}
                      <div
                        ref={activityScrollRef}
                        className="flex gap-3 overflow-x-auto flex-1 py-2 px-1 hide-scrollbar"
                        style={{ scrollSnapType: 'x mandatory' }}
                      >
                        {recentActivity.length > 0 ? (
                          recentActivity.map((activity) => {
                            const Icon = getActivityIcon(activity.action);
                            return (
                              <div
                                key={activity.id}
                              className="inline-flex flex-col w-72 min-w-[18rem] p-4 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                              style={{ 
                                scrollSnapAlign: 'start',
                                border: '2px solid',
                                borderImage: 'linear-gradient(135deg, #113738 0%, #0a9db0 100%) 1'
                              }}
                              >
                                <div className="flex items-start gap-3">
                                  <Icon className="h-5 w-5 text-foreground/70 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                      {activity.action}
                                    </div>
                                    {activity.resource && (
                                      <div className="text-xs text-foreground/60 truncate">{activity.resource}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-foreground/50">{getRelativeTime(activity.timestamp)}</div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-foreground/60 p-4 rounded-lg border border-border bg-secondary/30 w-full">No recent activity</div>
                        )}
                      </div>

                      {/* Right scroll button */}
                      <button
                        onClick={() => scrollActivity('right')}
                        disabled={!canScrollRight}
                        className="flex-shrink-0 p-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simple Alerts */}
                <div className="space-y-3 p-4 rounded-lg border-0" style={{
                  background: 'linear-gradient(135deg, #113738 0%, #0d5a5f 100%)'
                }}>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-white/80" />
                    <h3 className="font-semibold text-lg text-white">Alerts</h3>
                    <Badge className="ml-auto bg-white/25 text-white font-semibold">{alerts.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/10`}>
                          <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getAlertDotColor(alert.type)}`} />
                          <div className="text-sm text-white/90">{alert.message}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-white/70 p-3 rounded-lg border border-white/20 bg-white/10 w-full">
                        No alerts at the moment
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sensitivity Pie Chart */}
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-sm font-semibold mb-4 text-foreground">File Sensitivity</div>
                    <div className="h-48">
                      {hasFileSensitivityData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={fileSensitivityData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {fileSensitivityData.map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                          No file activity yet
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-4 mt-4 text-xs flex-wrap">
                      {fileSensitivityData.map((entry) => (
                        <div key={entry.key} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span className="text-foreground/80">
                            {entry.name} ({entry.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Login Activity Bar Chart */}
                  <div className="p-4 rounded-lg border-0" style={{
                    background: 'linear-gradient(135deg, #113738 0%, #0d5a5f 100%)'
                  }}>
                    <div className="text-sm font-semibold mb-4 text-white">Login Activity (Last 7 days)</div>
                    <div className="h-48">
                      {hasLoginActivity ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={loginActivityData}>
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#ffffff' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#ffffff' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="logins" fill="#0a9db0" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/60">
                          No login events in the last 7 days
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => navigate("/client/policies")} className="text-white font-medium" style={{
                    background: 'linear-gradient(135deg, #113738 0%, #0a9db0 100%)',
                    border: 'none'
                  }}>View Policies</Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings card removed as requested */}
          </div>
        </div>
      </main>

      {/* Page-level footer removed to avoid duplicate footers; use global footer */}
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit profile</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={closeEdit}>Close</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={localProfile?.firstName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={localProfile?.lastName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, lastName: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={localProfile?.company ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, company: e.target.value })} />
              </div>
              <div>
                <Label>Company domain</Label>
                <Input value={localProfile?.companyDomain ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, companyDomain: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Domain</Label>
                <Input value={localProfile?.domain ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, domain: e.target.value })} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closeEdit} type="button">Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ClientDashboard;
