'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import AvatarSection from '@/app/components/profile/AvatarSection';
import routePaths from '@/app/config/routePaths';
import useGetProfile from '@/app/hooks/useGetProfile';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { Avatar, Card, CardBody, Spinner } from '@heroui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaRegEdit, FaRegTrashAlt } from 'react-icons/fa';
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
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.scrollTo({ top: 0 });
      }, 100);
    }
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

  const handleDeletePhoto = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.EMPLOYER.DELETE_PROFILE_PHOTO);
      getProfile();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full lg:max-w-[320px]">
      <div className="flex flex-col items-center justify-center text-center pb-2">
        <div className="relative mb-3 group">
          <label
            htmlFor={loading ? '' : 'employee-photo-upload'}
            className={clsx(
              'relative block rounded-full transition-opacity',
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90',
            )}
          >
            <Avatar
              src={user?.profilePhoto}
              name={`${user?.firstName} ${user?.lastName}`}
              className="w-36 h-36"
              isBordered
              color="primary"
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-full z-10">
                <Spinner color="primary" size="sm" />
              </div>
            )}
          </label>

          <input
            id="employee-photo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePhotoChange}
            disabled={loading}
          />

          {!loading && (
            <div className="absolute bottom-0 right-0 flex gap-2 translate-y-1">
              <label
                htmlFor="employee-photo-upload"
                className="bg-primary backdrop-blur-md p-1.5 rounded-lg border border-white/20 cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
              >
                <FaRegEdit className="text-white text-sm" />
              </label>

              {user?.profilePhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto();
                  }}
                  className="bg-danger backdrop-blur-md p-1.5 rounded-lg border border-white/20 hover:bg-danger/90 transition-colors shadow-sm"
                >
                  <FaRegTrashAlt className="text-white text-sm" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col mt-2">
          <h2 className="text-xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h2>
          <div className="text-xs text-center text-gray-500">{user?.email}</div>
          <div className="px-4 flex justify-center items-center gap-2 mt-2">
            {user?.company?.logoUrl ? (
              <Image
                src={user?.company?.logoUrl}
                alt="Company"
                height={48}
                width={48}
                className="w-12 h-12 object-contain"
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
  { key: '1', label: 'Personal Information' },
  { key: '2', label: 'Company Details' },
];
