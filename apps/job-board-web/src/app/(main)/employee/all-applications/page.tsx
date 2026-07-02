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
import { Avatar, Button, Card, CardBody, Chip, Input, Tab, Tabs } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { IoIosSearch } from 'react-icons/io';
import { MdOutlineWorkOutline } from 'react-icons/md';
import { FiGrid, FiFileText, FiEye, FiStar, FiXCircle, FiCheckCircle, FiUser, FiTrendingUp } from 'react-icons/fi';

const getTabIcon = (key: string) => {
  switch (key) {
    case '': return <FiGrid size={16} />;
    case InterviewStatus.applied: return <FiFileText size={16} />;
    case InterviewStatus.viewed: return <FiEye size={16} />;
    case InterviewStatus.shortlisted: return <FiStar size={16} />;
    case InterviewStatus.rejected: return <FiXCircle size={16} />;
    case InterviewStatus.hired: return <FiCheckCircle size={16} />;
    default: return <FiGrid size={16} />;
  }
};

const ApplicationCard = ({ application }: { application: any }) => {
  const applicationId = application?.applicationId;
  const candidateId = application?.candidateId;
  const hasApplication = Boolean(applicationId && candidateId);

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
              {CommonUtils.keyIntoTitle(
                application?.status === 'hired' ? 'selected' : application?.status,
              )}
            </Chip>
          </div>
        </div>
        {hasApplication && (
          <div className="flex w-full gap-2">
            {permissionUtils.hasPermission("applications:review") && (
              <Button
                size="sm"
                color="primary"
                variant="bordered"
                as={Link}
                href={routePaths.employee.jobs.applicantProfile(
                  applicationId,
                  candidateId
                )}
                className="flex-1 border-[1px] font-medium hover:bg-primary-50"
                startContent={<FiUser size={16} strokeWidth={2.5} />}
              >
                View Profile
              </Button>
            )}

            <Button
              as={Link}
              href={routePaths.employee.jobs.applicantTrack(
                applicationId,
                candidateId
              )}
              color="success"
              variant="bordered"
              size="sm"
              className="flex-1 border-[1px] font-medium hover:bg-success-50"
              startContent={<FiTrendingUp size={16} strokeWidth={2.5} />}
            >
              Track
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const page = () => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const initialTab = useMemo(() => {
    const status = searchParams.get('status');
    if (status === 'selected') return 'hired';
    return tabs.includes(status as InterviewStatus) ? (status as string) : '';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [applications, setApplications] = useState<any>([]);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const getApplications = async (search?: string) => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.ALL, {
        params: {
          page,
          search,
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

  const handleSearch = (search: string) => {
    if (debounceTime) {
      clearTimeout(debounceTime);
    }
    setDebounceTime(
      setTimeout(() => {
        getApplications(search?.trim());
      }, 1500),
    );
  };

  return (
    <>
      <title>Applications</title>

      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            aria-label="Options"
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            classNames={{
              tabList: "bg-white border border-gray-100 shadow-sm p-1 rounded-xl",
              cursor: "bg-primary-50 rounded-lg",
              tab: "w-[110px] h-10 data-[selected=true]:text-primary",
              tabContent: "group-data-[selected=true]:text-primary font-medium"
            }}
          >
            <Tab
              key={''}
              title={
                <div className="flex items-center gap-2">
                  {getTabIcon('')}
                  <span>All</span>
                </div>
              }
            />
            {tabs.map(
              (key) =>
                key !== InterviewStatus.rescheduled &&
                key !== InterviewStatus.interview_scheduled && (
                  <Tab
                    key={key}
                    title={
                      <div className="flex items-center gap-2 relative">
                        {getTabIcon(key)}
                        <span>
                          {CommonUtils.keyIntoTitle(
                            key === InterviewStatus.hired ? 'Selected' : key,
                          )}
                        </span>
                      </div>
                    }
                  />
                ),
            )}
          </Tabs>
          <div className="w-full lg:max-w-[360px] lg:shrink-0">
            <Input
              onChange={(ev) => handleSearch(ev.target.value)}
              labelPlacement="outside"
              placeholder="Search by job title or candidate name"
              startContent={<IoIosSearch size={16} />}
              classNames={{
                inputWrapper:
                  "bg-gray-50 border border-black/20 shadow-none data-[focus=true]:border-primary transition-colors",
              }}
            />
          </div>
        </div>

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
