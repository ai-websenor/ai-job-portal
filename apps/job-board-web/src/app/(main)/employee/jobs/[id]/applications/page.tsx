'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import JobApplicantCard from '@/app/components/cards/JobApplicantCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { IApplication } from '@/app/types/types';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [applications, setApplications] = useState<IApplication[]>([]);

  const jobTitle = decodeURIComponent(searchParams.get('title') || '');

  const getApplications = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.LIST(id), {
        params: {
          page,
          limit: 10,
        },
      });
      if (response?.data) {
        setApplications(response.data);
        setTotalPages(response.pagination?.pageCount);
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
      <title>{jobTitle}</title>
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">{jobTitle} Applicants</h1>
          </div>

          {applications?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {applications?.map((item) => (
                  <JobApplicantCard
                    key={item.id}
                    applicationId={item?.id}
                    seeker={item?.jobSeeker}
                    createdAt={item?.appliedAt}
                  />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <p className="text-sm text-center text-default-400">No applications found</p>
          )}
        </div>
      )}
    </>
  );
};

export default withAuth(page);
