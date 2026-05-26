'use client';

import { useEffect, useState } from 'react';
import { CircularProgress } from '@heroui/react';
import { FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { clsx } from 'clsx';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { IProfileCompletion } from '@/app/types/types';
import LoadingProgress from '../lib/LoadingProgress';
import { IoAddCircleOutline } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import routePaths from '@/app/config/routePaths';

const ProfileCompletion = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState<IProfileCompletion | null>(null);

  const getProfileCompletion = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE_COMPLETION);
      if (response?.data) {
        setProfileCompletion(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfileCompletion();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('updateProfile', getProfileCompletion);

      return () => {
        window.removeEventListener('updateProfile', getProfileCompletion);
      };
    }
  }, []);

  const handleRedirect = (section: string) => {
    let tab = 1;
    switch (section) {
      case 'personalInfo':
        tab = 1;
        break;
      case 'education':
        tab = 2;
        break;
      case 'skills':
        tab = 3;
        break;
      case 'experience':
        tab = 4;
        break;
      case 'resume':
        tab = 5;
        break;
      case 'videoResume':
        tab = 6;
        break;
      case 'jobPreferences':
        tab = 7;
        break;
      case 'certification':
        tab = 8;
        break;
      default:
        tab = 1;
        break;
    }

    router.push(`${routePaths.profile}?tab=${tab}`);

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="w-full max-w-sm md:mx-auto lg:mx-0 bg-white rounded-xl p-4 sm:p-3 shadow-sm border border-default-100">
      {loading ? (
        <LoadingProgress />
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left sm:gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <CircularProgress
                aria-label="Profile completion"
                size="md"
                value={profileCompletion?.percentage || 0}
                color="primary"
                showValueLabel={true}
                classNames={{
                  svg: 'w-16 h-16',
                  indicator: 'stroke-primary',
                  track: 'stroke-default-100',
                  value: 'text-base font-bold text-default-700',
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-2 sm:gap-y-1 sm:justify-start">
                <h3 className="text-base font-bold text-default-900 leading-tight whitespace-nowrap sm:whitespace-normal">
                  Profile Completion
                </h3>
                {profileCompletion && profileCompletion?.remainingCount > 0 && (
                  <span className="text-sm font-medium text-default-600 whitespace-nowrap">
                    {profileCompletion?.remainingCount} Details Remaining
                  </span>
                )}
              </div>
              {/* <p className="text-xs text-default-400 mt-1"> Updated{" "} 
                {CommonUtils.determineDays(user?.updatedAt!)}
              </p> */}
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="self-center p-2 hover:bg-default-100 rounded-full transition-colors sm:self-auto"
              aria-label="Toggle details"
            >
              {isOpen ? (
                <FiChevronUp className="text-xl text-default-600" />
              ) : (
                <FiChevronDown className="text-xl text-default-600" />
              )}
            </button>
          </div>

          <div
            className={clsx(
              'grid transition-all duration-300 ease-in-out',
              isOpen
                ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-default-100'
                : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-4">
                {profileCompletion?.sections?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item?.isComplete ? (
                        <FiCheckCircle className="text-success text-xl shrink-0" />
                      ) : (
                        <FiXCircle className="text-danger text-xl shrink-0" />
                      )}
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          item.isComplete ? 'text-default-700' : 'text-default-400',
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {!item.isComplete && (
                      <button
                        onClick={() => handleRedirect(item.section)}
                        className="text-xs text-primary hover:underline font-medium flex items-center gap-0.5"
                      >
                        <IoAddCircleOutline size={16} /> Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileCompletion;
