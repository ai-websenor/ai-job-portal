import { FileText } from 'lucide-react';
import ContentEditorPage from './ContentEditorPage';

export default function AboutUsPage() {
  return (
    <ContentEditorPage
      slug="about-us"
      pageTitle="About Us"
      pageDescription="Manage the content displayed on the About Us page"
      icon={<FileText className="h-6 w-6 text-primary" />}
    />
  );
}
