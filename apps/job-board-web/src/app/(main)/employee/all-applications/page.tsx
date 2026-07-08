'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import AppDateRangePicker from '@/app/components/lib/AppDateRangePicker';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TablePagination from '@/app/components/table/TablePagination';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import { Avatar, Button, Card, CardBody, Chip, Input, Tab, Tabs, Select, SelectItem } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { parseDate } from '@internationalized/date';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const appliedOn = application?.appliedAt ? dayjs(application.appliedAt).format('DD MMM YYYY') : '';
  const isInterviewScheduled = application?.status === InterviewStatus.interview_scheduled;

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
              <span>{appliedOn ? `Applied on ${appliedOn}` : 'Applied'}</span>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={CommonUtils.getStatusColor(application?.status)}
              className={`capitalize font-semibold ${isInterviewScheduled ? 'border border-primary-200 bg-primary-50 text-primary' : ''}`}
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
  const [totalApplications, setTotalApplications] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | ''>('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { page, setPage, setTotalPages } = usePagination();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const getApplications = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: pageSize,
      };

      if (searchQuery) params.search = searchQuery;
      if (activeTab) params.status = activeTab;
      if (fromDate) params.fromDate = dayjs(fromDate).startOf('day').toISOString();
      if (toDate) params.toDate = dayjs(toDate).endOf('day').toISOString();

      const response: any = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.ALL, { params });
      if (response) {
        setApplications(response?.data ?? []);
        const nextPageCount = response?.pagination?.pageCount ?? 1;
        setPageCount(nextPageCount);
        setTotalPages(nextPageCount);
        setTotalApplications(response?.pagination?.totalApplications ?? response?.pagination?.total ?? response?.data?.length ?? 0);
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
  }, [page, pageSize, activeTab, searchQuery, fromDate, toDate]);

  const handleSearch = (value: string) => {
    setSearchValue(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
      setPage(1);
    }, 1500);
  };

  const clearDateFilters = () => {
    setDatePreset('');
    setFromDate('');
    setToDate('');
  };

  const handleQuickRange = (preset: 'today' | 'this_week' | 'this_month' | 'this_year') => {
    if (datePreset === preset) {
      clearDateFilters();
      setPage(1);
      return;
    }

    const range = {
      today: { from: dayjs().startOf('day'), to: dayjs().endOf('day') },
      this_week: { from: dayjs().startOf('week'), to: dayjs().endOf('week') },
      this_month: { from: dayjs().startOf('month'), to: dayjs().endOf('month') },
      this_year: { from: dayjs().startOf('year'), to: dayjs().endOf('year') },
    }[preset];

    setDatePreset(preset);
    setFromDate(range.from.format('YYYY-MM-DD'));
    setToDate(range.to.format('YYYY-MM-DD'));
    setPage(1);
  };

  const handleDateRangeChange = (value: any) => {
    if (!value) {
      clearDateFilters();
      setPage(1);
      return;
    }

    setDatePreset('');
    setFromDate(value.start ? value.start.toString() : '');
    setToDate(value.end ? value.end.toString() : '');
    setPage(1);
  };

  const dateRangeValue =
    fromDate && toDate
      ? {
          start: parseDate(fromDate),
          end: parseDate(toDate),
        }
      : null;

  return (
    <>
      <title>Applications</title>

      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        </div>

        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Tabs
            aria-label="Options"
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              setActiveTab(key as string);
              setPage(1);
            }}
            classNames={{
              tabList: 'bg-white border border-gray-100 shadow-sm p-1 rounded-xl',
              cursor: 'bg-primary-50 rounded-lg',
              tab: 'w-[110px] h-10 data-[selected=true]:text-primary',
              tabContent: 'group-data-[selected=true]:text-primary font-medium',
            }}
          >
            <Tab
              key=""
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
                        <span>{CommonUtils.keyIntoTitle(key === InterviewStatus.hired ? 'Selected' : key)}</span>
                      </div>
                    }
                  />
                ),
            )}
          </Tabs>
          
          <div className="w-full md:w-auto min-w-[160px]">
            <Select
              aria-label="Quick date range"
              placeholder="Quick Range"
              selectedKeys={datePreset ? [datePreset] : ['all']}
              onChange={(e) => {
                const val = e.target.value as any;
                if (val && val !== 'all') {
                  handleQuickRange(val);
                } else {
                  clearDateFilters();
                  setPage(1);
                }
              }}
              size="sm"
              classNames={{
                trigger: 'bg-white border border-gray-100 shadow-sm rounded-xl h-10',
              }}
            >
              <SelectItem key="all">All Time</SelectItem>
              <SelectItem key="today">Today</SelectItem>
              <SelectItem key="this_week">This Week</SelectItem>
              <SelectItem key="this_month">This Month</SelectItem>
              <SelectItem key="this_year">This Year</SelectItem>
            </Select>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-3">


              <div className="min-w-[260px] flex-[1.5] lg:max-w-[360px]">
                <I18nProvider locale="en-GB">
                  <AppDateRangePicker
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <FaRegCalendarAlt size={14} />
                        Date Range
                      </span>
                    }
                    labelPlacement="outside"
                    value={dateRangeValue as any}
                    onChange={handleDateRangeChange}
                    classNames={{
                      label: 'font-semibold text-gray-600',
                      inputWrapper: 'bg-gray-50 shadow-none hover:bg-gray-100',
                      separator: 'text-gray-400',
                      selectorButton: 'text-gray-500',
                    }}
                  />
                </I18nProvider>
              </div>
            </div>

            <div className="w-full lg:max-w-[360px] lg:shrink-0">
              <Input
                value={searchValue}
                onChange={(ev) => handleSearch(ev.target.value)}
                labelPlacement="outside"
                placeholder="Search by job title or candidate name"
                startContent={<IoIosSearch size={16} />}
                classNames={{
                  inputWrapper:
                    'bg-gray-50 border border-black/20 shadow-none data-[focus=true]:border-primary transition-colors',
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          {loading && applications?.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]">
              <LoadingProgress />
            </div>
          )}

          {loading && applications?.length === 0 ? (
            <LoadingProgress />
          ) : applications?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {applications.map((app: any) => (
                  <ApplicationCard key={app.applicationId} application={app} />
                ))}
              </div>

              <div className="mt-4">
                <TablePagination
                  label="applications"
                  totalItems={totalApplications}
                  currentPage={page}
                  totalPages={Math.max(1, pageCount)}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-default-500">No Applications yet</p>
          )}
        </div>
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
