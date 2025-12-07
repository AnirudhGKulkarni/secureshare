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

  // local copy of profile for immediate UI edits
  const [localProfile, setLocalProfile] = useState<any>(profile ?? {});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fileSensitivityData, setFileSensitivityData] = useState<FileSensitivityChartDatum[]>(() => buildEmptySensitivityData());
  const [loginActivityData, setLoginActivityData] = useState<LoginActivityDatum[]>(() => buildLastSevenDayBuckets());
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [recentActivity]);

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

  // Track recent activity (last 5 actions)
  useEffect(() => {
    if (!currentUser) return;

    const logsQuery = query(
      collection(firestore, 'audit_logs'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
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
        {/* NAVBAR */}
        <header className="bg-white border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">trustNshare</div>
              <div className="text-sm text-muted-foreground">Client Dashboard</div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={goToSettings} className="hidden sm:inline-flex">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Settings
                </span>
              </Button>

              <Button variant="ghost" onClick={goToProfile} className="hidden sm:inline-flex">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" /> {displayName}
                </span>
              </Button>

              <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Main area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {localProfile?.firstName ?? "Client"}!</CardTitle>
                <CardDescription>Overview of your account and quick actions.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Recent Activity (mini cards with horizontal scroll) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Recent Activity</h3>
                  </div>

                  <div className="relative">
                    <div
                      ref={activityRef as any}
                      className="flex gap-3 overflow-x-auto py-2 px-1"
                      style={{ scrollSnapType: 'x mandatory' }}
                    >
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => {
                          const Icon = getActivityIcon(activity.action);
                          return (
                            <div
                              key={activity.id}
                              className="inline-flex flex-col w-64 min-w-[16rem] p-3 rounded-md border bg-secondary/20"
                              style={{ scrollSnapAlign: 'start' }}
                            >
                              <div className="flex items-start gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {activity.action}
                                  </div>
                                  {activity.resource && (
                                    <div className="text-xs text-muted-foreground">{activity.resource}</div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-muted-foreground">{getRelativeTime(activity.timestamp)}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground p-3 rounded-md border">No recent activity</div>
                      )}
                    </div>

                    {/* Right-side scroll button */}
                    {canScrollRight && (
                      <button
                        aria-label="Scroll recent activity right"
                        onClick={() => {
                          const el = activityRef.current;
                          if (!el) return;
                          const amount = Math.floor(el.clientWidth * 0.8) || 300;
                          el.scrollBy({ left: amount, behavior: 'smooth' });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-white border rounded-full p-1 shadow hover:bg-gray-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Simple Alerts */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Alerts</h3>
                    <Badge variant="secondary" className="ml-auto">{alerts.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-md border ${getAlertColor(alert.type)}`}>
                          <div className={`h-2 w-2 rounded-full ${getAlertDotColor(alert.type)}`} />
                          <div className="text-sm">{alert.message}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground p-3 rounded-md border">
                        No alerts at the moment
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sensitivity Pie Chart */}
                  <div className="p-4 rounded-md border">
                    <div className="text-sm font-semibold mb-3">File Sensitivity</div>
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
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No file activity yet
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                      {fileSensitivityData.map((entry) => (
                        <div key={entry.key} className="flex items-center gap-1">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span>
                            {entry.name} ({entry.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Login Activity Bar Chart */}
                  <div className="p-4 rounded-md border">
                    <div className="text-sm font-semibold mb-3">Login Activity (Last 7 days)</div>
                    <div className="h-48">
                      {hasLoginActivity ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={loginActivityData}>
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="logins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No login events in the last 7 days
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => navigate("/client/policies")}>View Policies</Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings card removed as requested */}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-card border-t border-border text-muted-foreground py-8 px-6 mt-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand / About */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-foreground text-lg font-bold">trustNshare</span>
              </div>
              <p className="text-sm leading-relaxed">
                Enterprise-grade file sharing with military-grade encryption and complete compliance.
              </p>
            </div>

            {/* Contact & Support */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Contact & Support</h3>
              <div className="space-y-2">
                <div className="text-sm">trustnshare1@gmail.com</div>
                <div className="text-sm">+91 1234567890</div>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/ABOUT%20US.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors duration-300"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/PRIVACY%20POLICY.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors duration-300"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/TERMS%20AND%20CONDITIONS.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors duration-300"
                  >
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-border pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                {/* Social Links */}
                <div className="flex items-center gap-3">
                  {[
                    { icon: "f", label: "Facebook" },
                    { icon: "in", label: "LinkedIn" },
                    { icon: "𝕏", label: "Twitter" },
                    { icon: "📷", label: "Instagram" }
                  ].map((social) => (
                    <a
                      key={social.label}
                      href="#"
                      title={social.label}
                      className="text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/10 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 text-xs"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
              <p className="text-sm flex items-center gap-2">
                <span className="text-primary">©</span> 2025 trustNshare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
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
