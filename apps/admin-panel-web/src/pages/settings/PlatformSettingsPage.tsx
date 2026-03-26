/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Loader2, Save, Settings, Receipt, Mail } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

// ─── Types ─────────────────────────────────────────────────────────

interface InvoiceConfig {
  platformName: string;
  platformAddress: string;
  platformGstNumber: string;
  platformStateCode: string;
  defaultHsnCode: string;
}

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

const defaultInvoiceConfig: InvoiceConfig = {
  platformName: '',
  platformAddress: '',
  platformGstNumber: '',
  platformStateCode: '',
  defaultHsnCode: '',
};

// ─── Component ─────────────────────────────────────────────────────

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();

  // ── Invoice Config State ──
  const [invoiceForm, setInvoiceForm] = useState<InvoiceConfig>(defaultInvoiceConfig);

  // ── Email/Branding State ──
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({
    platformName: '',
    supportEmail: '',
    supportPhone: '',
    contactEmail: '',
    companyAddress: '',
    domainUrl: '',
    footerText: '',
  });

  // ── Queries ──

  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice-config'],
    queryFn: async () => {
      const response: any = await http.get(endpoints.platformConfig.invoice);
      return response.data as InvoiceConfig;
    },
  });

  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => {
      const response = await http.get(endpoints.emailSettings.get);
      return (response as unknown as { message: string; data: IEmailSettings }).data;
    },
  });

  const emailSettings = emailData || null;

  // ── Sync form state ──

  useEffect(() => {
    if (invoiceData) setInvoiceForm(invoiceData);
  }, [invoiceData]);

  useEffect(() => {
    if (emailData) {
      setEmailForm({
        platformName: emailData.platformName || '',
        supportEmail: emailData.supportEmail || '',
        supportPhone: emailData.supportPhone || '',
        contactEmail: emailData.contactEmail || '',
        companyAddress: emailData.companyAddress || '',
        domainUrl: emailData.domainUrl || '',
        footerText: emailData.footerText || '',
      });
    }
  }, [emailData]);

  // ── Mutations ──

  const invoiceMutation = useMutation({
    mutationFn: async (config: InvoiceConfig) => {
      return await http.put(endpoints.platformConfig.invoice, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-config'] });
      toast.success('Invoice settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update invoice settings');
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await http.put(endpoints.emailSettings.update, payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailSettings'] });
      toast.success('Branding settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update branding settings');
    },
  });

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

  // ── Handlers ──

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invoiceMutation.mutate(invoiceForm);
  };

  const handleInvoiceChange = (field: keyof InvoiceConfig, value: string) => {
    setInvoiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailSave = () => {
    if (!emailForm.platformName.trim()) {
      toast.error('Platform name is required');
      return;
    }
    emailMutation.mutate({
      platformName: emailForm.platformName.trim(),
      supportEmail: emailForm.supportEmail.trim() || null,
      supportPhone: emailForm.supportPhone.trim() || null,
      contactEmail: emailForm.contactEmail.trim() || null,
      companyAddress: emailForm.companyAddress.trim() || null,
      domainUrl: emailForm.domainUrl.trim() || null,
      footerText: emailForm.footerText.trim() || null,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    logoUploadMutation.mutate(file);

    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ── Loading ──

  if (invoiceLoading || emailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentLogoUrl = logoPreview || emailSettings?.logoUrl;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure invoice details, branding, and email settings used across the platform
          </p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2">
            <Mail className="h-4 w-4" />
            Branding & Email
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2">
            <Receipt className="h-4 w-4" />
            Invoice & GST
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Branding & Email ─── */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Logo</CardTitle>
                <CardDescription>
                  Displayed in emails, invoices, and PDFs. Recommended: 320x80px (4:1 ratio), max
                  2MB. JPEG, PNG, or WebP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center min-h-[140px] relative">
                  {currentLogoUrl ? (
                    <div className="relative group">
                      <img
                        src={currentLogoUrl}
                        alt="Platform Logo"
                        className="max-h-[80px] max-w-full object-contain"
                      />
                      <button
                        onClick={() => {
                          setLogoPreview(null);
                          emailMutation.mutate({ logoUrl: null });
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
                  Used in email headers, footers, invoice branding, and template variables.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>
                    Platform Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. AI Job Portal"
                    value={emailForm.platformName}
                    onChange={(e) => setEmailForm({ ...emailForm, platformName: e.target.value })}
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
                      value={emailForm.supportEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, supportEmail: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in email footer and invoice PDF
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Support Phone</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. +1-800-123-4567"
                      value={emailForm.supportPhone}
                      onChange={(e) => setEmailForm({ ...emailForm, supportPhone: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact number for phone support
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      placeholder="e.g. contact@yourplatform.com"
                      value={emailForm.contactEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, contactEmail: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">General contact email address</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Domain URL</Label>
                    <Input
                      placeholder="e.g. https://yourplatform.com"
                      value={emailForm.domainUrl}
                      onChange={(e) => setEmailForm({ ...emailForm, domainUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Platform URL shown in email footer and invoices
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Company Address</Label>
                  <Input
                    placeholder="e.g. 123 Business Ave, Suite 100, City, State 12345"
                    value={emailForm.companyAddress}
                    onChange={(e) => setEmailForm({ ...emailForm, companyAddress: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Physical address shown in email footer (CAN-SPAM compliance)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Textarea
                    placeholder="e.g. You are receiving this email because you have an account with AI Job Portal."
                    value={emailForm.footerText}
                    onChange={(e) => setEmailForm({ ...emailForm, footerText: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom text displayed at the bottom of every email and invoice PDF
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleEmailSave} disabled={emailMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {emailMutation.isPending ? 'Saving...' : 'Save Branding Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Invoice & GST ─── */}
        <TabsContent value="invoice">
          <form onSubmit={handleInvoiceSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Invoice Platform Details</CardTitle>
                <CardDescription>
                  These details appear on the "From" section of every invoice generated by the
                  system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Platform Name */}
                <div className="grid gap-2">
                  <Label htmlFor="platformName">Platform / Company Name</Label>
                  <Input
                    id="platformName"
                    placeholder="e.g. AI Job Portal Pvt Ltd"
                    value={invoiceForm.platformName}
                    onChange={(e) => handleInvoiceChange('platformName', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The legal entity name that appears at the top of the invoice.
                  </p>
                </div>

                {/* Platform Address */}
                <div className="grid gap-2">
                  <Label htmlFor="platformAddress">Registered Address</Label>
                  <Input
                    id="platformAddress"
                    placeholder="e.g. 123, MG Road, Mumbai, Maharashtra 400001"
                    value={invoiceForm.platformAddress}
                    onChange={(e) => handleInvoiceChange('platformAddress', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full registered address including city, state and pincode.
                  </p>
                </div>

                <Separator />

                <CardTitle className="text-base">GST Configuration</CardTitle>

                {/* GST Number */}
                <div className="grid gap-2">
                  <Label htmlFor="platformGstNumber">GST Number (GSTIN)</Label>
                  <Input
                    id="platformGstNumber"
                    placeholder="e.g. 27AXXXX1234Z1ZA"
                    value={invoiceForm.platformGstNumber}
                    onChange={(e) =>
                      handleInvoiceChange('platformGstNumber', e.target.value.toUpperCase())
                    }
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    15-character GST Identification Number. Leave blank if not GST registered.
                  </p>
                </div>

                {/* State Code + HSN Code side by side */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="platformStateCode">State Code</Label>
                    <Input
                      id="platformStateCode"
                      placeholder="e.g. 27"
                      value={invoiceForm.platformStateCode}
                      onChange={(e) => handleInvoiceChange('platformStateCode', e.target.value)}
                      maxLength={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      2-digit state code (e.g. 27 for Maharashtra). Used for CGST/SGST vs IGST
                      split.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="defaultHsnCode">Default HSN/SAC Code</Label>
                    <Input
                      id="defaultHsnCode"
                      placeholder="e.g. 998314"
                      value={invoiceForm.defaultHsnCode}
                      onChange={(e) => handleInvoiceChange('defaultHsnCode', e.target.value)}
                      maxLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      SAC code for services. Default: 998314 (Online content / IT services).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={invoiceMutation.isPending}>
                {invoiceMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Invoice Settings
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
