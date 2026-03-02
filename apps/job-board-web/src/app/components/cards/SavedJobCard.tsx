'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Card, CardBody, Button, Chip, Avatar, addToast } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IoShareSocialOutline, IoBookmark } from 'react-icons/io5';

type Props = {
  job: IJob;
  refetch?: () => void;
};

const SavedJobCard = ({ job, refetch }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const handleUnsaveJob = async () => {
    try {
      setLoading(true);
      http.delete(ENDPOINTS.JOBS.SAVE(job?.id as string));
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Job removed from saved jobs',
      });
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 p-2 hover:shadow-lg transition-all duration-300 group">
      <CardBody className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4 items-start w-full">
            <Avatar
              src={job?.company?.logoUrl || ''}
              name={job?.company?.name?.charAt(0)}
              className="w-14 h-14 min-w-14 min-h-14 text-large bg-gray-800 text-white rounded-xl"
            />
            <div className="w-full flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                  {job?.title}
                </h3>
                <p className="text-sm text-gray-500 font-medium line-clamp-1 mt-1">
                  {job?.company?.name} • {job?.state || job?.location || ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="min-w-8 w-8 h-8 text-gray-400 hover:text-gray-600"
                >
                  <IoShareSocialOutline className="text-xl" />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="min-w-8 w-8 h-8 text-primary/80 hover:text-primary"
                  onPress={handleUnsaveJob}
                  isLoading={loading}
                >
                  <IoBookmark className="text-xl" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 mt-2">
          <h2 className="text-xl font-bold text-primary/90">
            {job?.showSalary
              ? CommonUtils.formatSalary(job?.salaryMin, job?.salaryMax)
              : 'Salary Undisclosed'}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {job?.category?.name && (
            <Chip
              size="sm"
              variant="flat"
              className="bg-gray-100 text-gray-600 font-medium h-8 px-2"
            >
              {job?.category?.name}
            </Chip>
          )}
          {job?.jobType?.slice(0, 1).map((type, index) => (
            <Chip
              key={index}
              size="sm"
              variant="flat"
              className="bg-gray-100 text-gray-600 font-medium h-8 px-2"
            >
              {CommonUtils.keyIntoTitle(type)}
            </Chip>
          ))}
          {job?.experienceLevel && (
            <Chip
              size="sm"
              variant="flat"
              className="bg-gray-100 text-gray-600 font-medium h-8 px-2"
            >
              {job?.experienceLevel}
            </Chip>
          )}
        </div>

        <Button
          fullWidth
          size="lg"
          color="primary"
          onPress={quickApply}
          isLoading={loading}
          disabled={job?.isApplied}
          className="font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all rounded-xl"
        >
          {job?.isApplied ? 'Applied' : 'Quick Apply'}
        </Button>
      </CardBody>
    </Card>
  );
};

export default SavedJobCard;
