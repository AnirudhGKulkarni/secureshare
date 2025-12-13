import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Download } from 'lucide-react';
import policiesData from '@/data/policies.json';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Policy {
  id: string;
  policyName: string;
  policyDescription: string;
  policyCategory?: string;
  protectedFields?: { field: string; reason?: string }[];
  allowedActions?: Record<string, { allowed: boolean; notes?: string }>;
  status?: string;
}

const ClientPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [viewPolicy, setViewPolicy] = useState<Policy | null>(null);

  const handleDownloadPDF = (policy: Policy | null) => {
    if (!policy) return;
    // Client download should not prompt — use a generic signer label.
    const signer = 'Client';
    const timestamp = new Date().toLocaleString();

    const content = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Policy - ${policy.policyName}</title>
          <style>
            body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; padding: 24px; color: #111827 }
            .header { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e5e7eb; padding-bottom:12px; margin-bottom:16px }
            .brand { font-size:18px; font-weight:700; color:#0ea5a4 }
            .title { font-size:16px; font-weight:600 }
            .section { margin-top:12px }
            .section h4 { margin:0 0 6px 0; font-size:13px; color:#374151 }
            .field { border:1px solid #e5e7eb; padding:8px; border-radius:6px; margin-bottom:8px }
            .footer { margin-top:20px; border-top:1px dashed #d1d5db; padding-top:10px; font-size:12px; color:#6b7280 }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">trustNshare</div>
            <div style="text-align:right">
              <div style="font-weight:600">${policy.policyName}</div>
              <div style="font-size:12px;color:#6b7280">${policy.policyCategory || ''}</div>
            </div>
          </div>

          <div class="section">
            <h4>Description</h4>
            <div class="field">${(policy.policyDescription || '').replace(/\n/g, '<br/>')}</div>
          </div>

          <div class="section">
            <h4>Protected Fields</h4>
            ${((policy.protectedFields || []) as any[]).map(pf => `<div class="field"><strong>${pf.field}</strong><div style="color:#374151; margin-top:6px">${pf.reason || ''}</div></div>`).join('')}
          </div>

          <div class="section">
            <h4>Allowed Actions</h4>
            ${Object.entries(policy.allowedActions || {}).map(([k, v]: any) => `<div class="field"><strong>${k}</strong>: ${v.allowed ? 'Allowed' : 'Not Allowed'}${v.notes ? `<div style="color:#374151; margin-top:6px">${v.notes}</div>` : ''}</div>`).join('')}
          </div>

          <div class="footer">Digitally signed by ${signer} on ${timestamp}</div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) {
      // popup blocked
      alert('Unable to open print window. Please allow popups for this site.');
      return;
    }
    w.document.write(content);
    w.document.close();
    setTimeout(() => {
      try { w.focus(); w.print(); } catch (err) { /* ignore */ }
    }, 400);
  };

  useEffect(() => {
    // Prefer admin-managed policies stored in localStorage (key: 'policies_v1').
    // If none found, subscribe to Firestore realtime collection. Final fallback is static JSON.
    try {
      const raw = localStorage.getItem('policies_v1');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setPolicies(parsed as any[]);
            return;
          }
        } catch (err) {
          console.error('Failed to parse policies_v1 from localStorage:', err);
        }
      }
    } catch (err) {
      console.error('localStorage not available or accessible:', err);
    }

    // Subscribe to Firestore `policies` collection (realtime).
    try {
      const ref = collection(firestore, 'policies');
      const q = query(ref, orderBy('policyName'));
      const unsub = onSnapshot(q, (snap) => {
        const out: any[] = [];
        snap.forEach((d) => {
          out.push({ id: d.id, ...(d.data() as any) });
        });
        setPolicies(out);
      }, (err) => {
        console.error('Failed to subscribe to policies:', err);
        setPolicies((policiesData as any[]) || []);
      });
      return () => unsub();
    } catch (e) {
      console.error('Error initializing policies listener', e);
      setPolicies((policiesData as any[]) || []);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Policies</h2>
        <p className="text-sm text-muted-foreground">View data protection and access control policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">No policies available</div>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {policy.policyName}
                    </CardTitle>
                  </div>
                  {policy.status && (
                    <Badge variant={policy.status === 'Active' ? 'default' : 'secondary'}>
                      {policy.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Category</p>
                  <p className="text-sm">{policy.policyCategory || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Description</p>
                  <p className="text-sm line-clamp-2">{policy.policyDescription}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setViewPolicy(policy)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Policy Details Dialog */}
      <Dialog open={Boolean(viewPolicy)} onOpenChange={(v) => { if (!v) setViewPolicy(null); }}>
        <DialogContent className="w-full sm:w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {viewPolicy?.policyName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {viewPolicy && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <div className="mt-2 text-sm">{viewPolicy.policyDescription}</div>
                </div>

                {viewPolicy.policyCategory && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <div className="mt-2 text-sm">{viewPolicy.policyCategory}</div>
                  </div>
                )}

                {viewPolicy.protectedFields && viewPolicy.protectedFields.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Protected Fields</p>
                    <div className="mt-2 space-y-2">
                      {viewPolicy.protectedFields.map((pf: any, i: number) => (
                        <div key={i} className="p-2 border rounded text-sm">
                          <div className="font-medium">{pf.field}</div>
                          {pf.reason && <div className="text-xs text-muted-foreground">{pf.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewPolicy.allowedActions && Object.keys(viewPolicy.allowedActions).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Allowed Actions</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(viewPolicy.allowedActions).map(([key, val]: any) => (
                        <div key={key} className="p-2 border rounded text-sm">
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-xs text-muted-foreground">
                            {val.allowed ? '✓ Allowed' : '✗ Not allowed'}
                          </div>
                          {val.notes && <div className="text-xs text-muted-foreground mt-1">{val.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewPolicy.status && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <Badge variant={viewPolicy.status === 'Active' ? 'default' : 'secondary'}>
                        {viewPolicy.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => handleDownloadPDF(viewPolicy)}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button variant="outline" onClick={() => setViewPolicy(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPolicies;
