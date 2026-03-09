'use client';

import { useEffect, useState } from 'react';
import { CircularProgress } from '@heroui/react';
import { FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { clsx } from 'clsx';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { IProfileCompletion } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import useUserStore from '@/app/store/useUserStore';
import LoadingProgress from '../lib/LoadingProgress';

const ProfileCompletion = () => {
  const { user } = useUserStore();
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

  return (
    <div className="w-full max-w-md bg-white rounded-xl p-4 shadow-sm border border-default-100">
      {loading ? (
        <LoadingProgress />
      ) : (
        <>
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <CircularProgress
                aria-label="Profile completion"
                size="lg"
                value={profileCompletion?.percentage || 0}
                color="primary"
                showValueLabel={true}
                classNames={{
                  svg: 'w-20 h-20',
                  indicator: 'stroke-primary',
                  track: 'stroke-default-100',
                  value: 'text-lg font-bold text-default-700',
                }}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-default-900 leading-tight">
                Profile Completion
              </h3>
              {profileCompletion && profileCompletion?.remainingCount > 0 && (
                <p className="text-sm font-medium text-default-600">
                  {profileCompletion?.remainingCount} Details Remaining
                </p>
              )}
              <p className="text-xs text-default-400 mt-1">
                {CommonUtils.determineDays(user?.updatedAt!)}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 hover:bg-default-100 rounded-full transition-colors"
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
                  <div key={index} className="flex items-center gap-3">
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
