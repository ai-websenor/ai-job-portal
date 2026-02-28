'use client';

import { addToast, Button, Card, CardBody, Chip } from '@heroui/react';
import { MdOutlineWorkOutline, MdLocationOn, MdClose, MdOutlineMessage } from 'react-icons/md';
import { IApplication } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import Image from 'next/image';
import { InterviewStatus } from '@/app/types/enum';
import Link from 'next/link';
import routePaths from '@/app/config/routePaths';
import { useState } from 'react';
import ConfirmationDialog from '../dialogs/ConfirmationDialog';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const statusColorMap: Record<
  InterviewStatus,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
> = {
  [InterviewStatus.hired]: 'success',
  [InterviewStatus.rejected]: 'danger',
  [InterviewStatus.withdrawn]: 'danger',
  [InterviewStatus.shortlisted]: 'primary',
  [InterviewStatus.interview_scheduled]: 'warning',
  [InterviewStatus.rescheduled]: 'secondary',
};

const ApplicationCard = ({
  application,
  refetch,
}: {
  application: IApplication;
  refetch: () => void;
}) => {
  const { job } = application;
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.APPLICATIONS.WITHDRAW(application.id), {});
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Application withdrawn successfully',
      });
      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center gap-2 truncate">
              <h3 className="text-base font-bold text-gray-900 truncate" title={job?.title}>
                {job?.title}
              </h3>
              {job?.experienceMin !== undefined && (
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  ({job.experienceMin}
                  {job.experienceMin === 1 ? ' year+' : ' years+'})
                </span>
              )}
            </div>
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

        <div className="flex gap-2">
          {application.status === 'applied' && (
            <Button
              variant="flat"
              color="danger"
              size="sm"
              isLoading={loading}
              className="flex-1 font-semibold"
              onPress={() => setConfirmation(true)}
              startContent={<MdClose size={16} />}
            >
              Withdraw
            </Button>
          )}
          <Button
            variant="solid"
            color="primary"
            size="sm"
            as={Link}
            href={routePaths.chat.chatDetail(application.job.employer.id)}
            className="flex-1 font-semibold"
            startContent={<MdOutlineMessage size={16} />}
          >
            Message
          </Button>
        </div>
      </CardBody>

      {confirmation && (
        <ConfirmationDialog
          color="danger"
          isOpen={confirmation}
          title="Withdraw Application"
          message="Are you sure you want to withdraw your application?"
          onConfirm={handleWithdraw}
          onClose={() => setConfirmation(false)}
        />
      )}
    </Card>
  );
};

export default ApplicationCard;
