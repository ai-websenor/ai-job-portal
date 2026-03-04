'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import { Tab, Tabs } from '@heroui/react';
import { useEffect, useState } from 'react';

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
        <div className="flex flex-col gap-2 mb-4">
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
          {Object.values(InterviewStatus).map(
            (key) =>
              key !== InterviewStatus.rescheduled && (
                <Tab key={key} title={CommonUtils.keyIntoTitle(key)} />
              ),
          )}
        </Tabs>

        {loading ? (
          <LoadingProgress />
        ) : applications?.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10"></div>
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
