import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Shield, Share2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const Share = () => {
  const [file, setFile] = useState<File | null>(null);
  const [maskPII, setMaskPII] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);

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

    setIsSharing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSharing(false);
    setShared(true);
    toast.success('Data shared securely!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Share Data Securely</h2>
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
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.json"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-2">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV, XLSX, or JSON (Max 10MB)
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
                  <div className="space-y-0.5">
                    <Label htmlFor="mask-pii" className="text-base font-medium">
                      Mask PII
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically mask sensitive information
                    </p>
                  </div>
                  <Switch
                    id="mask-pii"
                    checked={maskPII}
                    onCheckedChange={setMaskPII}
                  />
                </div>

                {maskPII && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex gap-3">
                      <Shield className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Protected Fields</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          SSN, Credit Card Numbers, Email, Phone Numbers will be masked
                        </p>
                      </div>
                    </div>
                  </div>
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
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Sharing Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-secondary px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">Sample Data</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Name:</div>
                      <div className="font-mono">John Doe</div>
                      
                      <div className="text-muted-foreground">Email:</div>
                      <div className="font-mono">
                        {maskPII ? '****@***.com' : 'john@email.com'}
                      </div>
                      
                      <div className="text-muted-foreground">SSN:</div>
                      <div className="font-mono">
                        {maskPII ? '***-**-****' : '123-45-6789'}
                      </div>
                      
                      <div className="text-muted-foreground">Phone:</div>
                      <div className="font-mono">
                        {maskPII ? '***-***-****' : '555-123-4567'}
                      </div>
                      
                      <div className="text-muted-foreground">Address:</div>
                      <div className="font-mono">123 Main St</div>
                    </div>
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
      </div>
    </DashboardLayout>
  );
};

export default Share;
