// src/pages/ClientShare.tsx
import React, { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Link as LinkIcon } from "lucide-react";
// import storage / firestore logic as needed

const ClientShare: React.FC = () => {
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleShare = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsUploading(true);
    try {
      // TODO: integrate your existing share logic (upload file, write metadata to Firestore)
      // This is a placeholder to keep the UI consistent.
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Item shared with " + recipient);
      setRecipient("");
      setNote("");
    } catch (err: any) {
      console.error("share error:", err);
      toast.error("Failed to share");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ClientLayout title="Share">
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Share files
            </CardTitle>
            <CardDescription>Upload and share files with your contacts or teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShare} className="grid grid-cols-1 gap-4">
              <div>
                <Label>Recipient (email or group)</Label>
                <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="team@example.com" required />
              </div>

              <div>
                <Label>Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Sharing..." : "Share now"}
                </Button>
                <Button variant="outline" onClick={() => toast("Use the upload control to add files")}>
                  <span className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Get share link</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional client widgets (mirror admin) */}
        <Card>
          <CardHeader>
            <CardTitle>Shared items</CardTitle>
            <CardDescription>Files you have shared or received.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">No shared items yet.</div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default ClientShare;
