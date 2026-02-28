'use client';

import { Card, CardBody, Chip } from '@heroui/react';
import { MdOutlineWorkOutline, MdLocationOn } from 'react-icons/md';
import { IApplication } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import Image from 'next/image';
import { InterviewStatus } from '@/app/types/enum';

const statusColorMap: Record<
  InterviewStatus,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
> = {
  [InterviewStatus.hired]: 'success',
  [InterviewStatus.rejected]: 'danger',
  [InterviewStatus.shortlisted]: 'primary',
  [InterviewStatus.interview_scheduled]: 'warning',
  [InterviewStatus.rescheduled]: 'secondary',
};
const ApplicationCard = ({ application }: { application: IApplication }) => {
  const { job } = application;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 p-0">
      <CardBody className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start gap-3">
          <div className="bg-gray-50 rounded-lg p-2 min-w-[50px] h-[50px] flex items-center justify-center">
            {job?.company?.logoUrl ? (
              <Image
                src={job?.company?.logoUrl}
                alt={job?.company?.name}
                width={50}
                height={50}
                className="w-full h-full object-contain"
              />
            ) : (
              <MdOutlineWorkOutline className="text-2xl text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate" title={job?.title}>
              {job?.title}
            </h3>
            <p className="text-sm text-primary font-medium truncate">
              {job?.company?.name ?? 'Anonymous'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-gray-500 font-medium">
          {job?.experienceMin !== undefined && (
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <MdOutlineWorkOutline className="text-gray-400" />
              <span>
                {job?.experienceMin}-{job?.experienceMax} years
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
            <MdLocationOn className="text-gray-400" />
            <span className="truncate max-w-[100px]">
              {CommonUtils.keyIntoTitle(job?.workMode?.[0])}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
            <span className="font-semibold text-gray-700">
              {job?.showSalary
                ? CommonUtils.formatSalary(job?.salaryMin, job?.salaryMax)
                : 'Salary Undisclosed'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 mt-auto">
          <Chip
            size="sm"
            color={statusColorMap[application?.status as InterviewStatus] || 'default'}
            variant="flat"
            className="capitalize font-semibold px-2"
          >
            {CommonUtils.keyIntoTitle(application?.status)}
          </Chip>
          <span className="text-xs text-gray-400">
            {CommonUtils.determineDays(application?.appliedAt)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default ApplicationCard;
