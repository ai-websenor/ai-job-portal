'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import { Avatar, Button, Card, CardBody, Chip, Tab, Tabs } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { MdOutlineWorkOutline } from 'react-icons/md';

const ApplicationCard = ({ application }: { application: any }) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-divider">
      <CardBody className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={application?.candidateProfilePhoto}
            name={application?.candidateName}
            className="w-12 h-12 text-large shadow-sm"
            isBordered
            color="primary"
          />
          <div className="flex flex-col min-w-0">
            <h3
              className="text-base font-bold text-foreground truncate"
              title={application?.candidateName}
            >
              {application?.candidateName}
            </h3>
            <div className="flex items-center gap-1 text-default-500 text-xs">
              <MdOutlineWorkOutline size={14} />
              <span className="truncate">{application?.jobTitle}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1 text-default-400">
              <FaRegCalendarAlt size={12} />
              <span>Applied {CommonUtils.determineDays(application?.appliedAt)}</span>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={CommonUtils.getStatusColor(application?.status)}
              className="capitalize font-semibold"
            >
              {CommonUtils.keyIntoTitle(application?.status)}
            </Chip>
          </div>
        </div>

        {permissionUtils.hasPermission('applications:review') && (
          <Button
            size="sm"
            color="primary"
            as={Link}
            href={routePaths.employee.jobs.applicantProfile(
              application.applicationId,
              application.candidateId,
            )}
          >
            View Profile
          </Button>
        )}
      </CardBody>
    </Card>
  );
};

const page = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const { page, setTotalPages, renderPagination } = usePagination();
  const [applications, setApplications] = useState<any>([]);

  const getApplications = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.ALL, {
        params: {
          page,
          ...(activeTab && { status: activeTab }),
        },
      });
      if (response) {
        setApplications(response?.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      setApplications([]);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getApplications();
  }, [page, activeTab]);

  return (
    <>
      <title>Applications</title>

      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        </div>

        <Tabs
          aria-label="Options"
          className="mb-6"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
        >
          <Tab key={''} title={'All'} />
          {tabs.map(
            (key) =>
              key !== InterviewStatus.rescheduled &&
              key !== InterviewStatus.interview_scheduled && (
                <Tab key={key} title={CommonUtils.keyIntoTitle(key)} />
              ),
          )}
        </Tabs>

        {loading ? (
          <LoadingProgress />
        ) : applications?.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {applications.map((app: any) => (
                <ApplicationCard key={app.applicationId} application={app} />
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <p className="text-center text-default-500 text-sm">No Applications yet</p>
        )}
      </div>
    </>
  );
};

export default withAuth(page);

const tabs = [
  InterviewStatus.applied,
  InterviewStatus.viewed,
  InterviewStatus.shortlisted,
  InterviewStatus.interview_scheduled,
  InterviewStatus.rejected,
  InterviewStatus.hired,
];
