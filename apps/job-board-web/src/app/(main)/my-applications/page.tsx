'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ApplicationCard from '@/app/components/cards/ApplicationCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import usePagination from '@/app/hooks/usePagination';
import withAuth from '@/app/hoc/withAuth';
import { InterviewStatus } from '@/app/types/enum';
import { IApplication } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Input, Tab, Tabs } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import useNotificationStore from '@/app/store/useNotificationStore';
import { IoIosSearch } from 'react-icons/io';
import { MdPendingActions } from 'react-icons/md';
import { FiCheckCircle, FiEye, FiFileText, FiGrid, FiStar, FiXCircle } from 'react-icons/fi';

const statusTabs = [
  { key: '', label: 'All', icon: <FiGrid size={16} /> },
  { key: InterviewStatus.applied, label: CommonUtils.keyIntoTitle(InterviewStatus.applied), icon: <FiFileText size={16} /> },
  { key: InterviewStatus.viewed, label: CommonUtils.keyIntoTitle(InterviewStatus.viewed), icon: <FiEye size={16} /> },
  { key: InterviewStatus.shortlisted, label: CommonUtils.keyIntoTitle(InterviewStatus.shortlisted), icon: <FiStar size={16} /> },
  { key: InterviewStatus.rejected, label: CommonUtils.keyIntoTitle(InterviewStatus.rejected), icon: <FiXCircle size={16} /> },
  { key: 'selected', label: 'Selected', icon: <FiCheckCircle size={16} /> },
] as const;

const mapTabToStatus = (tab: string) => {
  if (!tab) return '';
  if (tab === 'selected') return InterviewStatus.hired;
  return tab;
};

function MyApplicationsPage() {
  const [loading, setLoading] = useState(false);
  const { page, setPage, setTotalPages, renderPagination } = usePagination();
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSignal = useNotificationStore((state) => state.refreshSignal);

  const getApplications = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };

      if (searchQuery) params.search = searchQuery;

      const status = mapTabToStatus(activeTab);
      if (status) params.status = status;

      const response: any = await http.get(ENDPOINTS.APPLICATIONS.LIST, { params });
      if (response?.data) {
        setApplications(response?.data ?? []);
        setTotalPages(response?.pagination?.pageCount ?? 1);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getApplications();
  }, [page, activeTab, searchQuery, refreshSignal]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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

  return (
    <>
      <title>My Applications</title>

      <div className="container w-full p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold">My Applications</h1>
          </div>

          <div className="w-full lg:max-w-[360px] lg:shrink-0">
            <Input
              value={searchValue}
              onChange={(ev) => handleSearch(ev.target.value)}
              labelPlacement="outside"
              placeholder="Search by job title or company name"
              startContent={<IoIosSearch size={16} />}
              classNames={{
                inputWrapper:
                  'bg-gray-50 border border-black/20 shadow-none hover:bg-gray-100 data-[focus=true]:border-primary transition-colors',
              }}
            />
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            aria-label="Application status filters"
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
            {statusTabs.map((tab) => (
              <Tab
                key={tab.key}
                title={
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                }
              />
            ))}
          </Tabs>
        </div>

        {loading ? (
          <LoadingProgress />
        ) : applications?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {applications?.map((app) => (
              <ApplicationCard key={app?.id} application={app} refetch={getApplications} />
            ))}
          </div>
        ) : (
          <div className="col-span-full mt-10 rounded-xl border border-gray-100 bg-white p-4 text-center text-gray-400 shadow-sm md:p-6">
            <MdPendingActions className="mx-auto mb-2 text-4xl opacity-50" />
            <p>No applications found in this category.</p>
          </div>
        )}

        {applications?.length > 0 && renderPagination()}
      </div>
    </>
  );
}

export default withAuth(MyApplicationsPage);
