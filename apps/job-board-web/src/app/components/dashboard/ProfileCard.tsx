'use client';

import routePaths from '@/app/config/routePaths';
import useUserStore from '@/app/store/useUserStore';
import { Button, Avatar, Card, CardBody } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { FaEye, FaDownload } from 'react-icons/fa';
import ProfileCompletion from './ProfileCompletion';

const ProfileCard = () => {
  const router = useRouter();
  const { user } = useUserStore();

  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary/10 to-secondary/10 w-full absolute top-0 left-0 z-0"></div>
      <CardBody className="flex flex-col items-center text-center gap-4 pt-12 relative z-10 p-6">
        <div className="p-1.5 rounded-full bg-white shadow-sm">
          <Avatar
            src={user?.profilePhoto}
            name={`${user?.firstName} ${user?.lastName}`}
            className="w-24 h-24 text-large border-4 border-white shadow-sm"
            isBordered
            color="primary"
          />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <h2 className="text-xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-sm text-gray-500 font-medium px-4">
            {user?.headline ?? 'No headline added'}
          </p>
        </div>

        <ProfileCompletion />

        <div className="flex flex-col w-full gap-3 mt-2">
          <Button
            color="primary"
            variant="solid"
            className="w-full font-medium shadow-md shadow-primary/20"
            startContent={<FaEye />}
            onPress={() => router.push(routePaths.profile)}
          >
            View Profile
          </Button>
          <Button
            color="primary"
            variant="flat"
            className="w-full font-medium"
            startContent={<FaDownload />}
            onPress={() => router.push(`${routePaths.profile}?tab=5`)}
          >
            Download Resume
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default ProfileCard;
