'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import SavedJobCard from '@/app/components/cards/SavedJobCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { IJob } from '@/app/types/types';
import { Input } from '@heroui/react';
import { useEffect, useState } from 'react';
import { IoIosSearch } from 'react-icons/io';
import { MdPendingActions } from 'react-icons/md';

const page = () => {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);

  const getJobs = async (search?: string) => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.JOBS.SAVED, {
        params: {
          page,
          limit: 10,
          search,
        },
      });
      if (response?.data) {
        setJobs(response?.data);
        setTotalPages(response?.pagination?.pageCount ?? 1);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, [page]);

  const handleSearch = (search: string) => {
    if (debounceTime) {
      clearTimeout(debounceTime);
    }
    setDebounceTime(
      setTimeout(() => {
        getJobs(search?.trim());
      }, 1500),
    );
  };

  return (
    <>
      <title>Saved Jobs</title>
      <div className="container w-full p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>

        <Input
          onChange={(ev) => handleSearch(ev.target.value)}
          labelPlacement="outside"
          placeholder="Search by job title or company name"
          startContent={<IoIosSearch size={16} />}
          classNames={{
            inputWrapper: 'bg-white border',
          }}
        />

        {loading ? (
          <LoadingProgress />
        ) : jobs?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
            {jobs?.map((job) => (
              <SavedJobCard key={job?.id} job={job} refetch={getJobs} />
            ))}
          </div>
        ) : (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 text-center text-gray-400 mt-5">
            <MdPendingActions className="mx-auto text-4xl mb-2 opacity-50" />
            <p>No jobs found in this category.</p>
          </div>
        )}
        {jobs?.length > 0 && renderPagination()}
      </div>
    </>
  );
};

export default withAuth(page);
