'use client';

import { IJob } from '@/app/types/types';
import { Card, CardBody, Button, Chip, addToast } from '@heroui/react';
import {
  IoLocationOutline,
  IoWalletOutline,
  IoBookmarkOutline,
  IoBriefcaseOutline,
  IoBookmark,
  IoTrendingUpOutline,
  IoDesktopOutline,
  IoCashOutline,
  IoBusinessOutline,
  IoPeopleOutline,
} from 'react-icons/io5';
import CommonUtils from '@/app/utils/commonUtils';
import { useRouter } from 'next/navigation';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import clsx from 'clsx';
import Image from 'next/image';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  job: Partial<IJob>;
  refetch?: () => void;
};

const JobCard = ({ job, refetch }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { getLocalStorage } = useLocalStorage();

  const token = getLocalStorage('token');

  const toggleJobSave = async () => {
    const token = getLocalStorage('token');

    if (!token) {
      router.push(routePaths.auth.login);
      return;
    }

    try {
      setLoading(true);

      const res: any = job?.isSaved
        ? await http.delete(ENDPOINTS.JOBS.SAVE(job?.id as string))
        : await http.post(ENDPOINTS.JOBS.SAVE(job?.id as string), {});

      addToast({
        color: 'success',
        title: 'Success',
        description: res?.message,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('jobSaved'));
      }

      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const quickApply = async () => {
    try {
      setLoading(true);
      const res: any = await http.post(ENDPOINTS.APPLICATIONS.QUICK_APPLY, {
        jobId: job?.id,
      });
      addToast({
        color: 'success',
        title: 'Success',
        description: res?.message,
      });
      refetch?.();
      router.push(routePaths.jobs.applicationSent(job?.company?.name || 'Anonymous'));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      as="div"
      isPressable
      onPress={() => router.push(routePaths.jobs.detail(job.id as string))}
      className="w-full mb-4 border border-transparent hover:border-primary/20 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group"
    >
      <CardBody className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start w-full mb-4">
          <div className="flex-shrink-0">
            {job?.company?.logoUrl ? (
              <Image
                height={300}
                width={300}
                src={job.company?.logoUrl!}
                alt="Company"
                className="w-[50px] object-contain"
              />
            ) : (
              <MdOutlineWorkOutline size={20} className="text-gray-600" />
            )}
          </div>

          <div className="flex-grow w-full">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                  {job.company?.name || 'Anonymous Company'}
                </p>
              </div>
              <Chip size="sm" variant="flat" className="font-medium h-6 flex-shrink-0">
                {CommonUtils.determineDays(job?.createdAt!) === 'Today'
                  ? 'New'
                  : CommonUtils.determineDays(job?.createdAt!)}
              </Chip>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-5 w-full">
          {job?.location && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoLocationOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">{job.location}</span>
            </div>
          )}

          {Array.isArray(job?.jobType) && job.jobType.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoBriefcaseOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">
                {job.jobType
                  .map((e) => (typeof e === 'string' ? CommonUtils.keyIntoTitle(e) : e))
                  .join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <IoWalletOutline className="text-primary text-base shrink-0" />
            <span className="font-medium text-xs">
              {job?.showSalary
                ? CommonUtils.formatSalary(job?.salaryMin, job?.salaryMax)
                : 'Salary Undisclosed'}
            </span>
          </div>

          {job?.payRate && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoCashOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">{CommonUtils.keyIntoTitle(job.payRate)}</span>
            </div>
          )}

          {Array.isArray(job?.workMode) && job.workMode.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoDesktopOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">
                {job.workMode
                  .map((mode) => (typeof mode === 'string' ? CommonUtils.keyIntoTitle(mode) : mode))
                  .join(', ')}
              </span>
            </div>
          )}

          {job?.experienceMin !== undefined && job?.experienceMin !== null && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoTrendingUpOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">
                {job.experienceMin}
                {job.experienceMax ? ` - ${job.experienceMax}` : '+'} Yrs Exp
              </span>
            </div>
          )}

          {job?.category?.name && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoBusinessOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">{job.category.name}</span>
            </div>
          )}

          {job?.employer?.department && (
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <IoPeopleOutline className="text-primary text-base shrink-0" />
              <span className="font-medium text-xs">{job.employer.department}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 line-clamp-2 sm:line-clamp-1 flex-1">
            {job.description}
          </p>

          {token && (
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <Button
                color="primary"
                className={clsx('font-medium px-6 flex-1 sm:flex-none', {
                  'bg-green-600': job?.isApplied,
                  'shadow-md shadow-primary/20': !job?.isApplied,
                })}
                size="sm"
                isLoading={loading}
                isDisabled={job?.isApplied}
                onPress={quickApply}
              >
                {job?.isApplied ? 'Applied' : 'Quick Apply'}
              </Button>

              <div className="flex gap-2">
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  color={job?.isSaved ? 'primary' : 'default'}
                  isLoading={loading}
                  className={clsx('transition-colors', {
                    'text-primary bg-primary/10': job?.isSaved,
                    'text-gray-400 hover:text-primary': !job?.isSaved,
                  })}
                  onPress={toggleJobSave}
                >
                  {job?.isSaved ? <IoBookmark size={20} /> : <IoBookmarkOutline size={20} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default JobCard;
