'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useGetProfile from '@/app/hooks/useGetProfile';
import useUserStore from '@/app/store/useUserStore';
import { Avatar, Card, CardBody } from '@heroui/react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaRegEdit, FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import LoadingProgress from '../lib/LoadingProgress';
import AvatarSection from './AvatarSection';
import { Roles } from '@/app/types/enum';
import ProfileCompletion from '../dashboard/ProfileCompletion';

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const ProfileLeftSection = ({ activeTab, setActiveTab }: Props) => {
  const router = useRouter();
  const { user } = useUserStore();
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);

  const handleChangeTab = (value: string) => {
    setActiveTab(value);
    router.push(`${routePaths.profile}?tab=${value}`);
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
        await http.post(ENDPOINTS.CANDIDATE.PROFILE_PHOTO, formData);
        getProfile();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('updateProfile'));
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeletePhoto = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_PROFILE_PHOTO);
      getProfile();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full lg:max-w-[320px] h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-scroll pr-2 pt-2 lg:sticky lg:top-24">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative mb-3 group">
          {/* Main Avatar Click Area */}
          <label
            htmlFor={loading ? '' : 'profile-upload'} // Disable label trigger when loading
            className={clsx(
              'block relative rounded-full',
              loading ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <Avatar
              src={user?.profilePhoto}
              name={`${user?.firstName} ${user?.lastName}`}
              className="w-36 h-36"
              isBordered
              color="primary"
            />

            {/* LOADING OVERLAY: Centered inside the avatar circle */}
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-full">
                <LoadingProgress />
                {/* If LoadingProgress is just text, use a Spinner from @heroui/react instead */}
              </div>
            )}
          </label>

          {/* The Hidden Input */}
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={loading} // Disable input while loading
            onChange={handleProfilePhotoChange}
          />

          {/* Icons Container - Hidden or disabled when loading */}
          {!loading && (
            <div className="absolute bottom-0 right-0 flex gap-2 translate-y-1 z-20">
              <label
                htmlFor="profile-upload"
                className="bg-primary backdrop-blur-md p-1.5 rounded-lg border border-white/20 cursor-pointer hover:bg-primary/90 transition-colors flex items-center justify-center shadow-lg"
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
                  className="bg-danger backdrop-blur-md p-1.5 rounded-lg border border-white/20 hover:bg-danger/90 transition-colors flex items-center justify-center shadow-lg"
                  title="Delete Photo"
                >
                  <FaRegTrashAlt className="text-white text-sm" />
                </button>
              )}
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-sm text-gray-500 font-medium">{user?.headline || 'N/A'}</p>
      </div>

      <div className="w-full mt-2">
        <AvatarSection role={Roles.candidate} />
      </div>

      <ProfileCompletion />

      <div className="flex flex-col gap-3">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Card
              isPressable
              key={tab.key}
              onPress={() => handleChangeTab(tab.key)}
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

export default ProfileLeftSection;

const tabs = [
  {
    key: '1',
    label: 'Personal Information',
  },
  {
    key: '2',
    label: 'Education Details',
  },
  {
    key: '3',
    label: 'Skills',
  },
  {
    key: '4',
    label: 'Experience Details',
  },
  {
    key: '5',
    label: 'Resume',
  },
  {
    key: '6',
    label: 'Video Resume',
  },
  {
    key: '7',
    label: 'Job Preferences',
  },
  {
    key: '8',
    label: 'Certifications',
  },
];
