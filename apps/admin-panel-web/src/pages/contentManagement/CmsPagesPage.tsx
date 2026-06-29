import { useState } from 'react';
import { FileText, ScrollText, Shield } from 'lucide-react';
import ContentEditorPage from './ContentEditorPage';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CMS_PAGES = [
  {
    slug: 'about-us',
    pageTitle: 'About Us',
    pageDescription: 'Manage the content displayed on the About Us page',
    icon: <FileText className="h-6 w-6 text-primary" />,
  },
  {
    slug: 'terms-conditions',
    pageTitle: 'Terms & Conditions',
    pageDescription: 'Manage the Terms and Conditions page content',
    icon: <ScrollText className="h-6 w-6 text-primary" />,
  },
  {
    slug: 'privacy-policy',
    pageTitle: 'Privacy Policy',
    pageDescription: 'Manage the Privacy Policy page content',
    icon: <Shield className="h-6 w-6 text-primary" />,
  },
] as const;

export default function CmsPagesPage() {
  const [slug, setSlug] = useState<string>(CMS_PAGES[0].slug);
  const active = CMS_PAGES.find((p) => p.slug === slug) ?? CMS_PAGES[0];

  const selector = (
    <div className="flex items-center gap-2">
      <Label className="text-sm whitespace-nowrap text-muted-foreground">Page</Label>
      <Select value={slug} onValueChange={setSlug}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CMS_PAGES.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.pageTitle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ContentEditorPage
      key={active.slug}
      slug={active.slug}
      pageTitle={active.pageTitle}
      pageDescription={active.pageDescription}
      icon={active.icon}
      selector={selector}
    />
  );
}
