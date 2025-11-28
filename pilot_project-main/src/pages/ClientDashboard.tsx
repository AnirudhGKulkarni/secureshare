// src/pages/ClientDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Settings, User } from "lucide-react";

const ClientDashboard: React.FC = () => {
  const { currentUser, profile, loading, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // local copy of profile for immediate UI edits
  const [localProfile, setLocalProfile] = useState<any | undefined>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
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
      } finally {
        setIsLoadingProfile(false);
      }
    };
    load();
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
  if (loading) return <div className="flex h-screen items-center justify-center">Checking session...</div>;
  if (!currentUser) return <div className="flex h-screen items-center justify-center">Not signed in</div>;

  // derive display values safely
  const displayName = (localProfile?.firstName ? `${localProfile.firstName}${localProfile?.lastName ? ` ${localProfile.lastName}` : ""}` : "") 
    || localProfile?.email 
    || currentUser.displayName 
    || currentUser.email?.split?.("@")?.[0] 
    || "Client";

  const email = localProfile?.email ?? currentUser.email;
  const domain = localProfile?.domain ?? "—";
  const role = localProfile?.role ?? "client";

  // role-aware navigation helpers (keeps client isolated from admin)
  const goToSettings = () => navigate("/client/settings");
  const goToProfile = () => navigate("/client/profile");

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">SecureShare</div>
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
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Profile Card */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-medium">{displayName}</div>
                    <div className="text-sm text-muted-foreground">{email}</div>
                  </div>
                </CardTitle>
                <CardDescription className="mt-2">{role === "client" ? "Client account" : role}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Domain</div>
                    <div className="mt-1">{domain}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Company</div>
                    <div className="mt-1">{localProfile?.company ?? "—"}</div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button onClick={openEdit}>Edit Profile</Button>
                    <Button variant="outline" onClick={() => refreshProfile()}>Refresh</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Main area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {localProfile?.firstName ?? "Client"}!</CardTitle>
                <CardDescription>Overview of your account and quick actions.</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md border">
                    <div className="text-sm text-muted-foreground">Recent activity</div>
                    <div className="mt-2 text-sm">No recent activity yet.</div>
                  </div>

                  <div className="p-4 rounded-md border">
                    <div className="text-sm text-muted-foreground">Shared items</div>
                    <div className="mt-2 text-sm">No items shared with you yet.</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button onClick={() => navigate("/share")}>Share a file</Button>
                  <Button variant="outline" onClick={() => navigate("/policies")}>View Policies</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage small preferences and account actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button onClick={() => navigate("/client/settings")}>Open Settings</Button>
                  <Button variant="outline" onClick={() => toast("No quick actions available yet")}>Quick help</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

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
    </div>
  );
};

export default ClientDashboard;
