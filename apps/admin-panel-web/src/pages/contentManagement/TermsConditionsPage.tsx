import { ScrollText } from 'lucide-react';
import ContentEditorPage from './ContentEditorPage';

export default function TermsConditionsPage() {
  return (
    <ContentEditorPage
      slug="terms-conditions"
      pageTitle="Terms & Conditions"
      pageDescription="Manage the Terms and Conditions page content"
      icon={<ScrollText className="h-6 w-6 text-primary" />}
    />
  );
}
