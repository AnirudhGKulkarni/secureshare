// src/pages/ClientProfile.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ClientProfile: React.FC = () => {
  const { currentUser, profile, refreshProfile } = useAuth();
  const [localProfile, setLocalProfile] = useState<any>(profile ?? {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalProfile(profile ?? {});
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, "users", currentUser.uid), {
        firstName: localProfile.firstName ?? "",
        lastName: localProfile.lastName ?? "",
        company: localProfile.company ?? null,
        companyDomain: localProfile.companyDomain ?? null,
        domain: localProfile.domain ?? "Other",
      }, { merge: true });
      toast.success("Profile updated");
      await refreshProfile();
    } catch (err: any) {
      console.error("save profile:", err);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>First name</Label>
              <Input value={localProfile.firstName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={localProfile.lastName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, lastName: e.target.value })} />
            </div>
            <div>
              <Label>Company</Label>
              <Input value={localProfile.company ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, company: e.target.value })} />
            </div>
            <div>
              <Label>Company domain</Label>
              <Input value={localProfile.companyDomain ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, companyDomain: e.target.value })} />
            </div>
            <div>
              <Label>Domain</Label>
              <Input value={localProfile.domain ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, domain: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLocalProfile(profile ?? {})} type="button">Reset</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfile;
