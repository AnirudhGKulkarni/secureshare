// src/pages/ClientProfile.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth, updatePassword } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ClientProfile: React.FC = () => {
  const { currentUser, profile, refreshProfile } = useAuth();
  const [localProfile, setLocalProfile] = useState<any>(profile ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setLocalProfile(profile ?? {});
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      // Save allowed profile fields to Firestore (do NOT store plaintext passwords here)
      await setDoc(doc(firestore, "users", currentUser.uid), {
        firstName: localProfile.firstName ?? "",
        lastName: localProfile.lastName ?? "",
      }, { merge: true });

      // If a new password was provided, update it securely via Firebase Auth
      if (password && password.length > 0) {
        const auth = getAuth();
        if (auth.currentUser) {
          try {
            await updatePassword(auth.currentUser, password);
            toast.success("Password updated");
          } catch (err: any) {
            console.error("Password update failed:", err);
            if (err.code === 'auth/requires-recent-login') {
              toast.error('Please re-authenticate (sign out and sign in) before changing your password.');
            } else {
              toast.error('Failed to update password');
            }
          }
        }
      }
      toast.success("Profile updated");
      await refreshProfile();
      setPassword("");
      setIsEditing(false);
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
          {/* Avatar selection removed per request */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>First name</Label>
              <Input disabled={!isEditing} value={localProfile.firstName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input disabled={!isEditing} value={localProfile.lastName ?? ""} onChange={(e) => setLocalProfile({ ...localProfile, lastName: e.target.value })} />
            </div>
            <div>
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  disabled={!isEditing}
                  placeholder={isEditing ? "Enter new password (leave blank to keep current)" : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                {isEditing && (
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} type="button">Edit</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setLocalProfile(profile ?? {}); setIsEditing(false); }} type="button">Cancel</Button>
                  <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfile;
