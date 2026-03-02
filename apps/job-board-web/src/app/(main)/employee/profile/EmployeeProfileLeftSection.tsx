'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import AvatarSection from '@/app/components/profile/AvatarSection';
import routePaths from '@/app/config/routePaths';
import useGetProfile from '@/app/hooks/useGetProfile';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { Avatar, Card, CardBody } from '@heroui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaRegEdit } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const EmployeeProfileLeftSection = ({ activeTab, setActiveTab }: Props) => {
  const router = useRouter();
  const { user } = useUserStore();
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`${routePaths.employee.profile}?tab=${tab}`);
  };

  const handleProfilePhotoChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    const file = ev.target?.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        await http.post(ENDPOINTS.EMPLOYER.UPDATE_PROFILE_PHOTO, formData);
        getProfile();
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full lg:max-w-[320px]">
      <div className="flex flex-col items-center justify-center text-center pb-2">
        <label className="relative mb-3 cursor-pointer">
          <Avatar src={user?.profilePhoto} className="w-36 h-36" isBordered color="primary" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePhotoChange}
          />
          <div className="absolute bottom-0 right-0 bg-primary/20 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
            <FaRegEdit className="text-white text-sm" />
          </div>
        </label>
        <div className="flex flex-col mt-2">
          <h2 className="text-xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h2>
          <div className="text-xs text-center text-gray-500">{user?.email}</div>
          <div className="px-4 flex justify-center items-center gap-2 mt-2">
            {user?.company?.logoUrl ? (
              <Image
                src={user?.company?.logoUrl!}
                alt="Company"
                height={300}
                width={300}
                className="w-12 object-contain"
              />
            ) : (
              <MdOutlineWorkOutline size={20} className="text-gray-600" />
            )}
            <p className="text-sm text-gray-600 font-medium">{user?.company?.name}</p>
          </div>
        </div>
      </div>

      <AvatarSection role={Roles.employer} />

      <div className="flex flex-col gap-3">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Card
              isPressable
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              className={clsx(
                'w-full shadow-none border border-gray-200 hover:border-primary bg-white transition-all duration-200',
                { 'border-2 border-primary': isActive },
              )}
            >
              <CardBody className="flex flex-row items-center justify-between p-3.5">
                <span className="text-sm font-semibold text-gray-700">{tab.label}</span>
                <div className="bg-primary/5 p-1.5 rounded-lg text-primary">
                  <FiEdit3 className="text-base" />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeProfileLeftSection;

const tabs = [
  {
    key: '1',
    label: 'Personal Information',
  },
  {
    key: '2',
    label: 'Company Details',
  },
];
