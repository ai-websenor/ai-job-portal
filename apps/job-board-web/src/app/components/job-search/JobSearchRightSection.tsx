'use client';

import AlertsFeedPreview from '@/app/components/alerts/AlertsFeedPreview';
import useAlerts from '@/app/hooks/useAlerts';
import routePaths from '@/app/config/routePaths';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { FiBell, FiUploadCloud } from 'react-icons/fi';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';

type Props = {
  onSaveAlert: () => void;
};

const JobSearchRightSection = ({ onSaveAlert }: Props) => {
  const router = useRouter();
  const { user } = useUserStore();
  const {
    interviewAlerts,
    interviewCount,
    subscriptionAlerts,
    subscriptionCount,
    loading,
  } = useAlerts();
  const showSubscriptionAlerts =
    user?.role === Roles.employer || user?.role === Roles.super_employer;
  const showInterviewAlertPreview = loading || interviewCount > 0;
  const showSubscriptionAlertPreview = showSubscriptionAlerts && (loading || subscriptionCount > 0);

  return (
    <div className="max-w-full sticky top-24 grid h-fit gap-6 sm:max-w-[300px]">
      <div className="grid gap-4">
        {showInterviewAlertPreview ? (
          <AlertsFeedPreview
            title="Interview alerts"
            alerts={interviewAlerts}
            count={interviewCount}
            loading={loading}
            viewAllHref={routePaths.alerts.byTab('interviews')}
            emptyMessage="No interview alerts are available right now."
          />
        ) : null}
        {showSubscriptionAlertPreview ? (
          <AlertsFeedPreview
            title="Subscription alerts"
            alerts={subscriptionAlerts}
            count={subscriptionCount}
            loading={loading}
            viewAllHref={routePaths.alerts.byTab('subscription')}
            emptyMessage="No subscription alerts are available right now."
          />
        ) : null}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
        <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 text-2xl text-primary">
          <FiBell />
        </div>
        <p className="font-bold text-gray-800 text-lg">Get job alerts</p>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Save these filters and get notified when matching jobs are posted.
        </p>
        <Button
          size="md"
          color="primary"
          onPress={onSaveAlert}
          className="mt-3 w-full font-medium shadow-lg shadow-primary/20"
        >
          Save this Search
        </Button>
        <Button
          size="md"
          color="primary"
          variant="flat"
          onPress={() => router.push(routePaths.jobAlerts.list)}
          className="mt-3 w-full font-medium"
        >
          Manage Alerts
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg text-primary">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-2xl backdrop-blur-sm">
          <FiUploadCloud />
        </div>
        <p className="font-bold text-lg">Get noticed faster</p>
        <p className="text-sm text-primary mt-2 leading-relaxed">
          Upload your resume and let top recruiters find you for your dream role.
        </p>
        <Button size="md" color="primary" fullWidth className="mt-3">
          Upload Resume
        </Button>
      </div>
    </div>
  );
};

export default JobSearchRightSection;
