import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShieldPlus, Pencil, Trash2, Shield, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Load structured policies from a centralized JSON file.
// Use relative import so Vite resolves it.
// @ts-ignore
import policiesData from '../data/policies.json';

type AllowedActionsShape = {
  view: { allowed: boolean; notes?: string };
  mask: { allowed: boolean; notes?: string };
  share: { allowed: boolean; notes?: string };
  download: { allowed: boolean; notes?: string };
  edit: { allowed: boolean; notes?: string };
  delete: { allowed: boolean; notes?: string };
};

interface StructuredPolicy {
  id: string;
  policyName: string;
  policyDescription: string;
  policyCategory?: string;
  protectedFields: { field: string; reason?: string }[];
  allowedActions: AllowedActionsShape;
  conditionsExceptions: { condition: string; details?: string }[];
  enforcementActions: string[];
  complianceNotes: string[];
  status: 'Active' | 'Inactive';
}

const STORAGE_KEY = 'policies_v1';

const mapSourceToStructured = (src: any[]) =>
  src.map((p: any, i: number) => ({
    id: String(i + 1),
    policyName: p.policyName || `Policy ${i + 1}`,
    policyDescription: p.policyDescription || '',
    policyCategory: p.policyCategory || '',
    protectedFields: (p.protectedFields || []).map((f: any) => ({ field: f.field, reason: f.reason })),
    allowedActions: p.allowedActions || {
      view: { allowed: true, notes: '' },
      mask: { allowed: true, notes: '' },
      share: { allowed: false, notes: '' },
      download: { allowed: false, notes: '' },
      edit: { allowed: false, notes: '' },
      delete: { allowed: false, notes: '' },
    },
    conditionsExceptions: p.conditionsExceptions || [],
    enforcementActions: p.enforcementActions || [],
    complianceNotes: p.complianceNotes || [],
    status: p.status === 'Inactive' ? 'Inactive' : 'Active',
  })) as StructuredPolicy[];

const loadInitial = (): StructuredPolicy[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StructuredPolicy[];
  } catch (e) {
    // ignore
  }
  return mapSourceToStructured(policiesData as any[]);
};

const Policies = () => {
  const [policies, setPolicies] = useState<StructuredPolicy[]>(() => loadInitial());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState<StructuredPolicy | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<StructuredPolicy | null>(null);

  const emptyForm = {
    policyName: '',
    policyDescription: '',
    policyCategory: '',
    // structured protected fields: array of { field, reason }
    protectedFields: [{ field: '', reason: '' }],
    policyCategoryOther: '',
    status: 'Active' as StructuredPolicy['status'],
    allowed_view: true,
    allowed_mask: true,
    allowed_share: false,
    allowed_download: false,
    allowed_edit: false,
    allowed_delete: false,
    actionNotes_view: '',
    actionNotes_mask: '',
    actionNotes_share: '',
    actionNotes_download: '',
    actionNotes_edit: '',
    actionNotes_delete: '',
    conditionsText: '',
    enforcementText: '',
    complianceText: '',
  } as const;

  const [formData, setFormData] = useState(() => ({ ...emptyForm }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
    } catch (e) {
      // ignore
    }
  }, [policies]);

  // If navigated with ?openCreate=true, open create dialog
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openCreate') === 'true') {
        setEditingPolicy(null);
        setFormData({ ...emptyForm });
        setIsDialogOpen(true);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  const openCreate = () => {
    setEditingPolicy(null);
    setFormData({ ...emptyForm });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build protectedFields from structured formData.protectedFields
    const protectedFields = ((formData as any).protectedFields || [])
      .map((pf: any) => ({ field: (pf.field || '').trim(), reason: (pf.reason || '').trim() }))
      .filter((pf: any) => pf.field);

    const conditionsExceptions = (formData as any).conditionsText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((l: string) => ({ condition: l, details: '' }));

    const enforcementActions = (formData as any).enforcementText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const complianceNotes = (formData as any).complianceText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const allowedActions: AllowedActionsShape = {
      view: { allowed: Boolean((formData as any).allowed_view), notes: (formData as any).actionNotes_view },
      mask: { allowed: Boolean((formData as any).allowed_mask), notes: (formData as any).actionNotes_mask },
      share: { allowed: Boolean((formData as any).allowed_share), notes: (formData as any).actionNotes_share },
      download: { allowed: Boolean((formData as any).allowed_download), notes: (formData as any).actionNotes_download },
      edit: { allowed: Boolean((formData as any).allowed_edit), notes: (formData as any).actionNotes_edit },
      delete: { allowed: Boolean((formData as any).allowed_delete), notes: (formData as any).actionNotes_delete },
    };

    // Resolve final category (if 'Other' selected, use policyCategoryOther)
    const finalCategory = (formData as any).policyCategory === 'Other'
      ? ((formData as any).policyCategoryOther || 'Other')
      : (formData as any).policyCategory || '';

    if (editingPolicy) {
      setPolicies(policies.map(p => p.id === editingPolicy.id ? {
        ...p,
        policyName: (formData as any).policyName,
        policyDescription: (formData as any).policyDescription,
        policyCategory: finalCategory,
        protectedFields,
        allowedActions,
        conditionsExceptions,
        enforcementActions,
        complianceNotes,
        status: (formData as any).status,
      } : p));
      toast.success('Policy updated successfully');
    } else {
      const newPolicy: StructuredPolicy = {
        id: String(Date.now()),
        policyName: (formData as any).policyName,
        policyDescription: (formData as any).policyDescription,
        policyCategory: finalCategory,
        protectedFields,
        allowedActions,
        conditionsExceptions,
        enforcementActions,
        complianceNotes,
        status: (formData as any).status,
      };
      setPolicies([...policies, newPolicy]);
      toast.success('Policy created successfully');
    }

    setIsDialogOpen(false);
    setEditingPolicy(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (policy: StructuredPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      policyName: policy.policyName,
      policyDescription: policy.policyDescription,
      // If category is a known option keep it, otherwise treat as Other and put value in policyCategoryOther
      policyCategory: [
        'HR','Finance','IT','Operations','Legal','Sales','Marketing','Product','Security','Compliance','Engineering','Customer Support'
      ].includes(policy.policyCategory || '') ? policy.policyCategory || '' : (policy.policyCategory ? 'Other' : ''),
      policyCategoryOther: [
        'HR','Finance','IT','Operations','Legal','Sales','Marketing','Product','Security','Compliance','Engineering','Customer Support'
      ].includes(policy.policyCategory || '') ? '' : (policy.policyCategory || ''),
      protectedFields: policy.protectedFields.length ? policy.protectedFields.map(pf => ({ field: pf.field, reason: pf.reason || '' })) : [{ field: '', reason: '' }],
      status: policy.status,
      allowed_view: policy.allowedActions.view.allowed,
      allowed_mask: policy.allowedActions.mask.allowed,
      allowed_share: policy.allowedActions.share.allowed,
      allowed_download: policy.allowedActions.download.allowed,
      allowed_edit: policy.allowedActions.edit.allowed,
      allowed_delete: policy.allowedActions.delete.allowed,
      actionNotes_view: policy.allowedActions.view.notes || '',
      actionNotes_mask: policy.allowedActions.mask.notes || '',
      actionNotes_share: policy.allowedActions.share.notes || '',
      actionNotes_download: policy.allowedActions.download.notes || '',
      actionNotes_edit: policy.allowedActions.edit.notes || '',
      actionNotes_delete: policy.allowedActions.delete.notes || '',
      conditionsText: (policy.conditionsExceptions || []).map(c => c.condition || c.details || '').join('\n'),
      enforcementText: (policy.enforcementActions || []).join('\n'),
      complianceText: (policy.complianceNotes || []).join('\n'),
    } as any);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPolicies(policies.filter(p => p.id !== id));
    toast.success('Policy deleted successfully');
  };

  const toggleStatus = (id: string) => {
    setPolicies(policies.map(p =>
      p.id === id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p
    ));
    toast.success('Policy status updated');
  };

  // Download policy as a print-friendly page (admin can Save as PDF).
  // Prompts for admin name to include a textual "Digitally signed by" footer with timestamp.
  const handleDownloadPDF = (policy: StructuredPolicy | null) => {
    if (!policy) return;
    const adminName = window.prompt('Enter your name for digital signature (will appear on PDF):', '') || 'Admin';
    const timestamp = new Date().toLocaleString();

    const content = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Policy - ${policy.policyName}</title>
          <style>
            body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 24px; color: #111827; }
            .header { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e5e7eb; padding-bottom:12px; margin-bottom:16px }
            .brand { font-size:20px; font-weight:700; color:#0ea5a4 }
            .title { font-size:18px; font-weight:600 }
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
            <h4>Policy Description</h4>
            <div class="field">${(policy.policyDescription || '').replace(/\n/g, '<br/>')}</div>
          </div>

          <div class="section">
            <h4>Protected Fields and Rationale</h4>
            ${policy.protectedFields.map(pf => `<div class="field"><strong>${pf.field}</strong><div style="color:#374151; margin-top:6px">${pf.reason || ''}</div></div>`).join('')}
          </div>

          <div class="section">
            <h4>Permitted Action to this policy</h4>
            ${Object.entries(policy.allowedActions).map(([k, v]) => `<div class="field"><strong>${k}</strong>: ${v.allowed ? 'Allowed' : 'Not Allowed'}${v.notes ? `<div style="color:#374151; margin-top:6px">${v.notes}</div>` : ''}</div>`).join('')}
          </div>

          <div class="section">
            <h4>Conditions & Exceptions</h4>
            ${policy.conditionsExceptions.length ? `<div class="field">${policy.conditionsExceptions.map(c => `<div><strong>${c.condition}</strong>${c.details ? ` — ${c.details}` : ''}</div>`).join('')}</div>` : '<div class="field">None specified</div>'}
          </div>

          <div class="section">
            <h4>Enforcement & Remediation</h4>
            ${policy.enforcementActions.length ? `<div class="field">${policy.enforcementActions.map(s => `<div>${s}</div>`).join('')}</div>` : '<div class="field">None specified</div>'}
          </div>

          <div class="section">
            <h4>Compliance & References</h4>
            ${policy.complianceNotes.length ? `<div class="field">${policy.complianceNotes.map(s => `<div>${s}</div>`).join('')}</div>` : '<div class="field">None specified</div>'}
          </div>

          <div class="footer">Digitally signed by ${adminName} on ${timestamp}</div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Unable to open print window. Please allow popups for this site.');
      return;
    }
    w.document.write(content);
    w.document.close();
    // give browser a small moment to render then open print dialog
    setTimeout(() => {
      try { w.focus(); w.print(); } catch (err) { /* ignore */ }
    }, 400);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Policy Management</h2>
            <p className="text-muted-foreground mt-1">Define and manage data sharing policies</p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={openCreate} className="bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90">
              <ShieldPlus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="shadow-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{policy.policyName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{policy.policyDescription}</p>
                      {policy.policyCategory && <p className="text-xs text-muted-foreground mt-1">Category: {policy.policyCategory}</p>}
                    </div>
                  </div>
                  <Badge variant={policy.status === 'Active' ? 'default' : 'secondary'}>{policy.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Protected Fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {policy.protectedFields.map((pf, i) => (
                        <Badge key={i} variant="outline" className="bg-secondary/50">{pf.field}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(policy.id)}>
                      {policy.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setViewPolicy(policy)}>
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(policy)}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(policy.id)}>
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) setEditingPolicy(null); }}>
          <DialogContent className="dialog-content w-full sm:w-[640px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</DialogTitle>
              <DialogDescription>{editingPolicy ? 'Update policy details' : 'Policy is a collection of data sharing rules'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-auto pr-2 hide-scrollbar">
                <div className="space-y-2">
                  <Label htmlFor="policyName">Policy Name</Label>
                  <Input id="policyName" value={(formData as any).policyName} onChange={(e) => setFormData({ ...(formData as any), policyName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policyDescription">Policy Description</Label>
                  <Textarea id="policyDescription" value={(formData as any).policyDescription} onChange={(e) => setFormData({ ...(formData as any), policyDescription: e.target.value })} rows={2} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policyCategory">Policy Category</Label>
                  <select
                    id="policyCategory"
                    value={(formData as any).policyCategory}
                    onChange={(e) => setFormData({ ...(formData as any), policyCategory: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 bg-card"
                  >
                    <option value="" disabled>Select category</option>
                    <option>HR</option>
                    <option>Finance</option>
                    <option>IT</option>
                    <option>Operations</option>
                    <option>Legal</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Product</option>
                    <option>Security</option>
                    <option>Compliance</option>
                    <option>Engineering</option>
                    <option>Customer Support</option>
                    <option>Other</option>
                  </select>
                  {(formData as any).policyCategory === 'Other' && (
                    <div className="mt-2">
                      <Input placeholder="Specify category" value={(formData as any).policyCategoryOther || ''} onChange={(e) => setFormData({ ...(formData as any), policyCategoryOther: e.target.value })} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Protected Fields — Field & Reason</Label>
                  <div className="space-y-2">
                    {((formData as any).protectedFields || []).map((pf: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          placeholder="Field name"
                          value={pf.field}
                          onChange={(e) => {
                            const next = { ...(formData as any) };
                            next.protectedFields = (next.protectedFields || []).slice();
                            next.protectedFields[idx] = { ...next.protectedFields[idx], field: e.target.value };
                            setFormData(next);
                          }}
                          className="col-span-5"
                          required
                        />
                        <Input
                          placeholder="Reason (optional)"
                          value={pf.reason}
                          onChange={(e) => {
                            const next = { ...(formData as any) };
                            next.protectedFields = (next.protectedFields || []).slice();
                            next.protectedFields[idx] = { ...next.protectedFields[idx], reason: e.target.value };
                            setFormData(next);
                          }}
                          className="col-span-6"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...(formData as any) };
                            next.protectedFields = (next.protectedFields || []).slice();
                            next.protectedFields.splice(idx, 1);
                            if (next.protectedFields.length === 0) next.protectedFields = [{ field: '', reason: '' }];
                            setFormData(next);
                          }}
                          className="col-span-1 inline-flex items-center justify-center rounded-md px-2 py-1 text-sm border"
                          aria-label="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...(formData as any) };
                          next.protectedFields = (next.protectedFields || []).slice();
                          next.protectedFields.push({ field: '', reason: '' });
                          setFormData(next);
                        }}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 border bg-card"
                      >
                        <Plus className="h-4 w-4" /> Add field
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" className="input" value={(formData as any).status} onChange={(e) => setFormData({ ...(formData as any), status: e.target.value as any })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Permitted Action to this policy</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_view} onChange={(e) => setFormData({ ...(formData as any), allowed_view: e.target.checked })} /> View</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_mask} onChange={(e) => setFormData({ ...(formData as any), allowed_mask: e.target.checked })} /> Mask</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_share} onChange={(e) => setFormData({ ...(formData as any), allowed_share: e.target.checked })} /> Share</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_download} onChange={(e) => setFormData({ ...(formData as any), allowed_download: e.target.checked })} /> Download</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_edit} onChange={(e) => setFormData({ ...(formData as any), allowed_edit: e.target.checked })} /> Edit</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={(formData as any).allowed_delete} onChange={(e) => setFormData({ ...(formData as any), allowed_delete: e.target.checked })} /> Delete</label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditionsText">Conditions & Exceptions</Label>
                  <Textarea id="conditionsText" value={(formData as any).conditionsText} onChange={(e) => setFormData({ ...(formData as any), conditionsText: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enforcementText">Enforcement & Remediation Actions</Label>
                  <Textarea id="enforcementText" value={(formData as any).enforcementText} onChange={(e) => setFormData({ ...(formData as any), enforcementText: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complianceText">Compliance Notes & References</Label>
                  <Textarea id="complianceText" value={(formData as any).complianceText} onChange={(e) => setFormData({ ...(formData as any), complianceText: e.target.value })} rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingPolicy(null); }}>Cancel</Button>
                <Button type="submit">{editingPolicy ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={Boolean(viewPolicy)} onOpenChange={(v) => { if (!v) setViewPolicy(null); }}>
          <DialogContent className="dialog-content w-full sm:w-[640px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{viewPolicy?.policyName}</DialogTitle>
              <DialogDescription>{viewPolicy?.policyDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[60vh] overflow-auto pr-2">
              {viewPolicy && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Protected Fields — Rationale</p>
                    <div className="space-y-2">
                      {viewPolicy.protectedFields.map((pf, i) => (
                        <div key={i} className="p-2 rounded border">
                          <div className="font-medium">{pf.field}</div>
                          {pf.reason && <div className="text-sm text-muted-foreground">{pf.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Permitted Action to this policy</p>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(viewPolicy.allowedActions).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-3">
                          <div className="w-28 font-medium">{k}</div>
                          <div>{v.allowed ? 'Allowed' : 'Not Allowed'}</div>
                          {v.notes && <div className="text-sm text-muted-foreground ml-4">{v.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Conditions & Exceptions</p>
                    <ul className="list-disc ml-5 text-sm">
                      {viewPolicy.conditionsExceptions.map((c, i) => (
                        <li key={i}>{c.condition}{c.details ? ` — ${c.details}` : ''}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Enforcement & Remediation</p>
                    <ul className="list-disc ml-5 text-sm">
                      {viewPolicy.enforcementActions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Compliance & References</p>
                    <ul className="list-disc ml-5 text-sm">
                      {viewPolicy.complianceNotes.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => handleDownloadPDF(viewPolicy)}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
              <Button variant="outline" onClick={() => setViewPolicy(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Policies;
