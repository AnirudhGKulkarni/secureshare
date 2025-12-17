// src/pages/ClientShare.tsx
import React, { useEffect, useState } from 'react';
// DashboardLayout removed for client page; keep page standalone
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Shield, Share2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import policiesJson from '@/data/policies.json';
import { auth, firestore } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ClientShare: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [policy, setPolicy] = useState<any | null>(null);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [availablePolicies, setAvailablePolicies] = useState<any[]>([]);
  const [viewPolicy, setViewPolicy] = useState<any | null>(null);
  const navigate = useNavigate();

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShared(false);
      toast.success('File uploaded successfully');
    }
  };

  const handleShare = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }
    if (!policy) {
      toast.error('Please create or select a security policy before sharing');
      return;
    }
    if (selectedClients.length === 0) {
      toast.error('Please choose one or more recipients before sharing');
      return;
    }

    // perform simulated share
    setIsSharing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSharing(false);
    setShared(true);
    toast.success(`Data shared securely to ${selectedClients.length} client(s)`);
  };

  const loadPolicies = () => {
    try {
      const raw = localStorage.getItem('policies_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAvailablePolicies(parsed);
        return;
      }
    } catch (e) {
      // ignore
    }
    // fallback to static JSON
    setAvailablePolicies((policiesJson as any) || []);
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(collection(firestore, 'users'), where('role', '==', 'client'), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          fetched.push({ uid: data?.uid ?? d.id, firstName: data?.firstName ?? '', lastName: data?.lastName ?? '', email: data?.email ?? '' });
        });
        setClients(fetched);
      } catch (e) {
        console.error('Failed to fetch clients', e);
        toast.error('Failed to load clients');
      }
    };

    if (isClientDialogOpen) {
      fetchClients();
    }
  }, [isClientDialogOpen]);

  useEffect(() => {
    loadPolicies();
  }, []);

  const toggleClientSelection = (uid: string) => {
    setSelectedClientIds((prev) => {
      if (prev.includes(uid)) return prev.filter((p) => p !== uid);
      return [...prev, uid];
    });
  };

  const confirmClientShare = async () => {
    if (selectedClientIds.length === 0) {
      toast.error('Select one or more clients to share with');
      return;
    }
    const chosen = clients.filter((c) => selectedClientIds.includes(c.uid));
    setSelectedClients(chosen);
    setIsClientDialogOpen(false);
    toast.success(`${chosen.length} recipient(s) selected`);
  };

  return (
    <div className="space-y-6 pl-6 lg:pl-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Share Data Securely</h2>
          <p className="text-muted-foreground mt-1">
            Upload and share data with controlled third-party access
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="file-upload-client"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="*/*"
                  />
                  <label htmlFor="file-upload-client" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-2">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All file types accepted
                    </p>
                  </label>
                </div>

                {file && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label className="text-base font-medium">Security Policy</Label>
                    <p className="text-sm text-muted-foreground">Create or select a security policy for this share</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">Select Policy</Button>
                        </DialogTrigger>
                        <DialogContent className="w-full sm:w-[640px] max-h-[80vh] bg-card text-foreground">
                      <DialogHeader>
                        <DialogTitle>Select Security Policy</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 mt-2">
                          {availablePolicies.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium">{p.policyName}</div>
                                <div className="text-xs text-muted-foreground">{p.policyCategory}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => {
                                    setPolicy(p);
                                    setIsPolicyDialogOpen(false);
                                    toast.success(`${p.policyName} selected`);
                                  }}
                                >
                                  Select
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setViewPolicy(p)}>View</Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => setIsClientDialogOpen(true)} disabled={!policy} className={`${!policy ? 'opacity-50 pointer-events-none' : ''}`}>Choose Recipients</Button>
                    </div>
                </div>

                {policy ? (
                  <>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{policy.policyName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{policy.policyDescription}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsClientDialogOpen(true)}>Choose Recipients</Button>
                    </div>
                  </>
                ) : (
                  // intentionally blank when no policy selected
                  <div />
                )}
              </div>

              <Button
                onClick={handleShare}
                disabled={!file || isSharing}
                className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90"
              >
                {isSharing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Data Securely
                  </>
                )}
              </Button>

              {shared && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Data Shared Successfully!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Your data has been securely shared with the authorized party
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Policy view dialog (reuses policy detail display similar to Policies page) */}
              <Dialog open={Boolean(viewPolicy)} onOpenChange={(v) => { if (!v) setViewPolicy(null); }}>
                <DialogContent className="w-full sm:w-[640px] max-h-[80vh] bg-card text-foreground">
                  <DialogHeader>
                    <DialogTitle>{viewPolicy?.policyName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4 max-h-[60vh] overflow-auto pr-2">
                    {viewPolicy && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Description</p>
                          <div className="mt-2 text-sm">{viewPolicy.policyDescription}</div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Protected Fields</p>
                          <div className="mt-2 space-y-2">
                            {(viewPolicy.protectedFields || []).map((pf: any, i: number) => (
                              <div key={i} className="p-2 border rounded">
                                <div className="font-medium">{pf.field}</div>
                                {pf.reason && <div className="text-xs text-muted-foreground">{pf.reason}</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Allowed Actions</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            {viewPolicy.allowedActions && Object.entries(viewPolicy.allowedActions).map(([k, v]: any) => (
                              <div key={k} className="p-2 border rounded">
                                <div className="font-medium">{k}</div>
                                <div className="text-xs text-muted-foreground">{v.allowed ? 'Allowed' : 'Not allowed'}</div>
                                {v.notes && <div className="text-xs text-muted-foreground mt-1">{v.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={() => setViewPolicy(null)}>Close</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Sharing Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-secondary px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">Sharing Preview</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedClients.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">Data sharing to:</div>
                        {selectedClients.map((c) => (
                          <div key={c.uid} className="grid grid-cols-2 gap-x-4 text-sm">
                            <div className="text-muted-foreground">Name:</div>
                            <div className="font-medium">{c.firstName} {c.lastName}</div>
                            <div className="text-muted-foreground">Email:</div>
                            <div className="font-mono">{c.email}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="text-muted-foreground">Name:</div>
                        <div className="font-mono">&nbsp;</div>
                        <div className="text-muted-foreground">Email:</div>
                        <div className="font-mono">&nbsp;</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent border border-primary/20">
                  <p className="text-sm font-medium mb-2">Encryption Status</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>End-to-end encryption active</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Security Features</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      256-bit AES encryption
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Audit trail enabled
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Time-limited access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Automatic PII detection
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Client selection dialog for sharing */}
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
          <DialogContent className="max-w-3xl bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Select Client(s) to Share With</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {clients.length === 0 && <div className="text-sm text-muted-foreground">No clients found</div>}
                {clients.map((c) => (
                  <label key={c.uid} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <div>
                      <Checkbox checked={selectedClientIds.includes(c.uid)} onCheckedChange={() => toggleClientSelection(c.uid)} />
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsClientDialogOpen(false); setSelectedClientIds([]); }}>
                  Cancel
                </Button>
                <Button onClick={confirmClientShare} disabled={isSharing}>
                  {isSharing ? 'Sharing...' : 'Share to Selected'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

    </div>
  );
}

export default ClientShare;
