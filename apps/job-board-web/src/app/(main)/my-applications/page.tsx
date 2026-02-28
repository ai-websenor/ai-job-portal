'use client';

import { useEffect, useState } from 'react';
import { MdPendingActions } from 'react-icons/md';
import { IApplication } from '@/app/types/types';
import ApplicationAnalytics from './ApplicationAnalytics';
import ApplicationCard from '@/app/components/cards/ApplicationCard';
import usePagination from '@/app/hooks/usePagination';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';

function MyApplicationsPage() {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [applications, setApplications] = useState<IApplication[]>([]);

  const getApplications = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.APPLICATIONS.LIST, {
        params: {
          page,
          limit: 10,
        },
      });
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
  }, [page]);

  return (
    <>
      <title>My Applications</title>
      <div className="container w-full p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">My Applications</h1>
        <ApplicationAnalytics applications={applications} />
        {loading ? (
          <LoadingProgress />
        ) : applications?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
            {applications?.map((app) => (
              <ApplicationCard key={app?.id} application={app} refetch={getApplications} />
            ))}
          </div>
        ) : (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 text-center text-gray-400">
            <MdPendingActions className="mx-auto text-4xl mb-2 opacity-50" />
            <p>No applications found in this category.</p>
          </div>
        )}
        {applications?.length > 0 && renderPagination()}
      </div>
    </>
  );
}

export default withAuth(MyApplicationsPage);
