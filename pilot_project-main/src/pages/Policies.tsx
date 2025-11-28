import { useState } from 'react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShieldPlus, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Policy {
  id: string;
  name: string;
  description: string;
  fields: string;
  status: 'Active' | 'Inactive';
}

const initialPolicies: Policy[] = [
  {
    id: '1',
    name: 'Customer PII Protection',
    description: 'Masks sensitive customer information before sharing',
    fields: 'SSN, Credit Card, Phone Number',
    status: 'Active',
  },
  {
    id: '2',
    name: 'Financial Data Policy',
    description: 'Restricts access to financial records',
    fields: 'Account Balance, Transaction History',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Vendor Access Control',
    description: 'Limits vendor access to operational data only',
    fields: 'Order Details, Inventory',
    status: 'Inactive',
  },
];

const Policies = () => {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: '',
    status: 'Active' as Policy['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPolicy) {
      setPolicies(policies.map(p => p.id === editingPolicy.id ? { ...p, ...formData } : p));
      toast.success('Policy updated successfully');
    } else {
      const newPolicy: Policy = {
        id: Date.now().toString(),
        ...formData,
      };
      setPolicies([...policies, newPolicy]);
      toast.success('Policy created successfully');
    }

    setIsDialogOpen(false);
    setEditingPolicy(null);
    setFormData({ name: '', description: '', fields: '', status: 'Active' });
  };

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description,
      fields: policy.fields,
      status: policy.status,
    });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Policy Management</h2>
            <p className="text-muted-foreground mt-1">
              Define and manage data sharing policies
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90">
                <ShieldPlus className="mr-2 h-4 w-4" />
                Create Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</DialogTitle>
                <DialogDescription>
                  {editingPolicy ? 'Update policy details' : 'Define a new data sharing policy'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Customer Data Protection"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this policy does"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fields">Protected Fields</Label>
                  <Input
                    id="fields"
                    value={formData.fields}
                    onChange={(e) => setFormData({ ...formData, fields: e.target.value })}
                    placeholder="e.g., SSN, Email, Phone Number (comma separated)"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPolicy ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                      <CardTitle className="text-xl">{policy.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
                    </div>
                  </div>
                  <Badge variant={policy.status === 'Active' ? 'default' : 'secondary'}>
                    {policy.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Protected Fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {policy.fields.split(',').map((field, i) => (
                        <Badge key={i} variant="outline" className="bg-secondary/50">
                          {field.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(policy.id)}
                    >
                      {policy.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Policies;
