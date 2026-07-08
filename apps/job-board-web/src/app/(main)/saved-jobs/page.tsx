'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import SavedJobCard from '@/app/components/cards/SavedJobCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { IJob } from '@/app/types/types';
import { Button, Input } from '@heroui/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { IoIosSearch } from 'react-icons/io';
import { MdPendingActions } from 'react-icons/md';

type RangeKey = '' | 'today' | 'this_week' | 'this_month' | 'this_year';

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7;
  return dayjs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff))
    .startOf('day')
    .toISOString();
};

const getRangeFromKey = (range: Exclude<RangeKey, ''>) => {
  const now = new Date();

  switch (range) {
    case 'today':
      return dayjs(new Date(now.getFullYear(), now.getMonth(), now.getDate())).startOf('day').toISOString();
    case 'this_week':
      return getStartOfWeek();
    case 'this_month':
      return dayjs(new Date(now.getFullYear(), now.getMonth(), 1)).startOf('day').toISOString();
    case 'this_year':
      return dayjs(new Date(now.getFullYear(), 0, 1)).startOf('day').toISOString();
    default:
      return '';
  }
};

const page = () => {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, setPage, setTotalPages, renderPagination } = usePagination();
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRange, setActiveRange] = useState<RangeKey>('');
  const [fromDate, setFromDate] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getJobs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };

      if (searchQuery) params.search = searchQuery;
      if (fromDate) params.fromDate = fromDate;

      const response: any = await http.get(ENDPOINTS.JOBS.SAVED, { params });
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
  }, [page, searchQuery, fromDate]);

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

  const handleRangeChange = (range: RangeKey) => {
    if (!range) {
      setActiveRange('');
      setFromDate('');
      setPage(1);
      return;
    }

    if (activeRange === range) {
      setActiveRange('');
      setFromDate('');
      setPage(1);
      return;
    }

    setActiveRange(range);
    setFromDate(getRangeFromKey(range));
    setPage(1);
  };

  return (
    <>
      <title>Saved Jobs</title>

      <div className="container w-full p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold">Saved Jobs</h1>
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

        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeRange === '' ? 'solid' : 'bordered'}
            color="primary"
            onPress={() => handleRangeChange('')}
            className="font-medium"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={activeRange === 'today' ? 'solid' : 'bordered'}
            color="primary"
            onPress={() => handleRangeChange('today')}
            className="font-medium"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={activeRange === 'this_week' ? 'solid' : 'bordered'}
            color="primary"
            onPress={() => handleRangeChange('this_week')}
            className="font-medium"
          >
            This Week
          </Button>
          <Button
            size="sm"
            variant={activeRange === 'this_month' ? 'solid' : 'bordered'}
            color="primary"
            onPress={() => handleRangeChange('this_month')}
            className="font-medium"
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant={activeRange === 'this_year' ? 'solid' : 'bordered'}
            color="primary"
            onPress={() => handleRangeChange('this_year')}
            className="font-medium"
          >
            This Year
          </Button>
        </div>

        {loading ? (
          <LoadingProgress />
        ) : jobs?.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs?.map((job) => (
              <SavedJobCard key={job?.id} job={job} refetch={getJobs} />
            ))}
          </div>
        ) : (
          <div className="col-span-full mt-5 rounded-xl border border-gray-100 bg-white p-4 text-center text-gray-400 shadow-sm md:p-6">
            <MdPendingActions className="mx-auto mb-2 text-4xl opacity-50" />
            <p>No jobs found in this category.</p>
          </div>
        )}

        {jobs?.length > 0 && renderPagination()}
      </div>
    </>
  );
};

export default withAuth(page);
