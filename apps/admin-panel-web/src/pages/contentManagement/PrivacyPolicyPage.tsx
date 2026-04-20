import { Shield } from 'lucide-react';
import ContentEditorPage from './ContentEditorPage';

export default function PrivacyPolicyPage() {
  return (
    <ContentEditorPage
      slug="privacy-policy"
      pageTitle="Privacy Policy"
      pageDescription="Manage the Privacy Policy page content"
      icon={<Shield className="h-6 w-6 text-primary" />}
    />
  );
}
