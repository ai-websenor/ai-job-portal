/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Save } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

interface IEmailSettings {
  id: string;
  platformName: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  contactEmail: string | null;
  companyAddress: string | null;
  domainUrl: string | null;
  footerText: string | null;
  updatedAt: string;
}

const EmailSettingsPage = () => {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    platformName: '',
    supportEmail: '',
    supportPhone: '',
    contactEmail: '',
    companyAddress: '',
    domainUrl: '',
    footerText: '',
  });

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => {
      const response = await http.get(endpoints.emailSettings.get);
      return (response as unknown as { message: string; data: IEmailSettings }).data;
    },
  });

  const settings = data || null;

  // Initialize form when data loads
  useEffect(() => {
    if (data) {
      setFormData({
        platformName: data.platformName || '',
        supportEmail: data.supportEmail || '',
        supportPhone: data.supportPhone || '',
        contactEmail: data.contactEmail || '',
        companyAddress: data.companyAddress || '',
        domainUrl: data.domainUrl || '',
        footerText: data.footerText || '',
      });
    }
  }, [data]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await http.put(endpoints.emailSettings.update, payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailSettings'] });
      toast.success('Email settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update settings');
    },
  });

  // Logo upload mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await http.post(endpoints.emailSettings.uploadLogo, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailSettings'] });
      toast.success('Logo uploaded successfully');
      setLogoPreview(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload logo');
      setLogoPreview(null);
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    logoUploadMutation.mutate(file);

    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!formData.platformName.trim()) {
      toast.error('Platform name is required');
      return;
    }
    updateMutation.mutate({
      platformName: formData.platformName.trim(),
      supportEmail: formData.supportEmail.trim() || null,
      supportPhone: formData.supportPhone.trim() || null,
      contactEmail: formData.contactEmail.trim() || null,
      companyAddress: formData.companyAddress.trim() || null,
      domainUrl: formData.domainUrl.trim() || null,
      footerText: formData.footerText.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentLogoUrl = logoPreview || settings?.logoUrl;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global email branding and footer information applied to all outgoing emails.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Logo</CardTitle>
            <CardDescription>
              Displayed at the top of all outgoing emails. Recommended: 320x80px (4:1 ratio), max
              2MB. JPEG, PNG, or WebP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center min-h-[140px] relative">
              {currentLogoUrl ? (
                <div className="relative group">
                  <img
                    src={currentLogoUrl}
                    alt="Email Logo"
                    className="max-h-[80px] max-w-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setLogoPreview(null);
                      // Optionally clear by updating with null
                      updateMutation.mutate({ logoUrl: null });
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No logo uploaded</p>
                </div>
              )}
              {logoUploadMutation.isPending && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                {currentLogoUrl ? 'Replace Logo' : 'Upload Logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                320 x 80 px &middot; 4:1 ratio &middot; Max 2MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform & Contact Details</CardTitle>
            <CardDescription>
              These values are used in email headers, footers, and template variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>
                Platform Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. AI Job Portal"
                value={formData.platformName}
                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {'Used in email headers and {{platformName}} template variables'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  placeholder="e.g. support@yourplatform.com"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in email footer for user support
                </p>
              </div>
              <div className="space-y-2">
                <Label>Support Phone</Label>
                <Input
                  type="tel"
                  placeholder="e.g. +1-800-123-4567"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Contact number for phone support</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="e.g. contact@yourplatform.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">General contact email address</p>
              </div>
              <div className="space-y-2">
                <Label>Domain URL</Label>
                <Input
                  placeholder="e.g. https://yourplatform.com"
                  value={formData.domainUrl}
                  onChange={(e) => setFormData({ ...formData, domainUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Platform URL shown in email footer</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Address</Label>
              <Input
                placeholder="e.g. 123 Business Ave, Suite 100, City, State 12345"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Physical address shown in email footer (CAN-SPAM compliance)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea
                placeholder="e.g. You are receiving this email because you have an account with AI Job Portal."
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Custom text displayed at the bottom of every email
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailSettingsPage;
