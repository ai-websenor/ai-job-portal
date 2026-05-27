'use client';

import routePaths from '@/app/config/routePaths';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { FiBell, FiUploadCloud } from 'react-icons/fi';

type Props = {
  onSaveAlert: () => void;
};

const JobSearchRightSection = ({ onSaveAlert }: Props) => {
  const router = useRouter();

  return (
    <div className="max-w-full sm:max-w-[300px] h-fit grid gap-6 sticky top-24">
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
