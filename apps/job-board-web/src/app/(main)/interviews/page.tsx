'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import InterviewCard from '@/app/components/interviews/InterviewCard';
import withCandidateAuth from '@/app/hoc/withCandidateAuth';
import useDebouncedValue from '@/app/hooks/useDebouncedValue';
import usePagination from '@/app/hooks/usePagination';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Button, Input, Select, SelectItem, Tab, Tabs } from '@heroui/react';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { FiFilter, FiSearch } from 'react-icons/fi';

const SEGMENTS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'canceled', label: 'Canceled' },
  { key: 'all', label: 'All' },
] as const;

const INTERVIEW_TYPES = [
  'phone',
  'video',
  'in_person',
  'technical',
  'hr',
  'panel',
  'assessment',
] as const;

const INTERVIEW_MODES = ['online', 'offline'] as const;

const isUuidV4 = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const buildQueryParams = (options: {
  segment: (typeof SEGMENTS)[number]['key'];
  page: number;
  search: string;
  interviewType: string;
  interviewMode: string;
  fromDate: string;
  toDate: string;
}) => {
  const params: Record<string, string | number> = {
    page: options.page,
    limit: 10,
  };

  if (options.interviewType) params.interviewType = options.interviewType;
  if (options.interviewMode) params.interviewMode = options.interviewMode;
  if (options.segment === 'completed') params.status = 'completed';
  if (options.segment === 'canceled') params.status = 'canceled';

  if (options.segment !== 'upcoming') {
    if (options.fromDate) params.fromDate = options.fromDate;
    if (options.toDate) params.toDate = options.toDate;

    const trimmedSearch = options.search.trim();
    if (trimmedSearch) {
      if (isUuidV4(trimmedSearch)) {
        params.jobId = trimmedSearch;
      } else {
        params.jobName = trimmedSearch;
      }
    }
  }

  return params;
};

const InterviewSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="animate-pulse space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-gray-100" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 rounded bg-gray-100" />
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
            <div className="h-6 w-16 rounded-full bg-gray-100" />
            <div className="h-6 w-16 rounded-full bg-gray-100" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-4 rounded bg-gray-100" />
            <div className="h-4 rounded bg-gray-100" />
            <div className="h-4 rounded bg-gray-100" />
            <div className="h-4 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ hasFilters }: { hasFilters: boolean }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
    <h2 className="text-xl font-bold text-gray-950">No interviews found</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
      {hasFilters ? 'Try adjusting filters or clearing the search field.' : 'No interviews are available yet.'}
    </p>
  </div>
);

const Page = () => {
  const { page, setPage, setTotalPages, renderPagination } = usePagination();
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]['key']>('upcoming');
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [interviewMode, setInterviewMode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        debouncedSearch.trim() ||
          interviewType ||
          interviewMode ||
          fromDate ||
          toDate,
      ),
    [debouncedSearch, fromDate, interviewMode, interviewType, toDate],
  );

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError('');

      const endpoint =
        segment === 'upcoming' ? ENDPOINTS.INTERVIEWS.UPCOMING : ENDPOINTS.INTERVIEWS.LIST;

      const response: any = await http.get(
        endpoint,
        { params: buildQueryParams({
          segment,
          page,
          search: debouncedSearch,
          interviewType,
          interviewMode,
          fromDate,
          toDate,
        }) },
      );

      setInterviews(response?.data || []);
      setTotalPages(response?.pagination?.pageCount || 1);
    } catch (err: any) {
      setInterviews([]);
      setTotalPages(1);
      setError(err?.message || err?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [debouncedSearch, fromDate, interviewMode, interviewType, page, segment, toDate]);

  const setPageAndReset = (nextPage = 1) => {
    setPage(nextPage);
  };

  const renderControls = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 lg:max-w-[320px] lg:flex-1">
          <Input
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPageAndReset(1);
            }}
            placeholder="Search by job title or job ID"
            labelPlacement="outside"
            startContent={<FiSearch size={16} className="text-gray-400" />}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
          {isUuidV4(search) && (
            <p className="mt-1 text-xs font-medium text-primary">Searching by Job ID</p>
          )}
        </div>

        <div className="w-full min-w-[180px] lg:w-[220px]">
          <Select
            placeholder="All types"
            label="Interview type"
            labelPlacement="outside"
            selectedKeys={interviewType ? [interviewType] : []}
            onSelectionChange={(keys) => {
              setInterviewType(String(Array.from(keys)[0] || ''));
              setPageAndReset(1);
            }}
            classNames={{ trigger: 'bg-gray-50 border-gray-200 shadow-none' }}
          >
            {INTERVIEW_TYPES.map((type) => (
              <SelectItem key={type}>{CommonUtils.getInterviewTypeLabel(type)}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="w-full min-w-[180px] lg:w-[220px]">
          <Select
            placeholder="All modes"
            label="Interview mode"
            labelPlacement="outside"
            selectedKeys={interviewMode ? [interviewMode] : []}
            onSelectionChange={(keys) => {
              setInterviewMode(String(Array.from(keys)[0] || ''));
              setPageAndReset(1);
            }}
            classNames={{ trigger: 'bg-gray-50 border-gray-200 shadow-none' }}
          >
            {INTERVIEW_MODES.map((mode) => (
              <SelectItem key={mode}>{CommonUtils.keyIntoTitle(mode)}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="w-full min-w-[160px] lg:w-[180px]">
          <Input
            type="date"
            label="From"
            labelPlacement="outside"
            value={fromDate}
            onValueChange={(value) => {
              setFromDate(value);
              setPageAndReset(1);
            }}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
        </div>

        <div className="w-full min-w-[160px] lg:w-[180px]">
          <Input
            type="date"
            label="To"
            labelPlacement="outside"
            value={toDate}
            onValueChange={(value) => {
              setToDate(value);
              setPageAndReset(1);
            }}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
        </div>

        <div className="flex w-full lg:w-auto items-end">
          <Button
            variant="flat"
            color="default"
            startContent={<FiFilter size={16} />}
            onPress={() => {
              setSearch('');
              setInterviewType('');
              setInterviewMode('');
              setFromDate('');
              setToDate('');
              setPageAndReset(1);
            }}
            className="h-12 w-full min-w-[120px] px-5 font-semibold lg:w-auto"
          >
            Reset
          </Button>
        </div>
      </div>

      {segment === 'upcoming' && (
        <p className="mt-3 text-xs font-medium text-gray-500">
          Upcoming uses the future-only feed. Type and mode filters apply here; dates and search stay on the other tabs.
        </p>
      )}
    </div>
  );

  return (
    <>
      <title>My Interviews</title>
      <div className="container mx-auto w-full px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">My Interviews</h1>
            <p className="mt-1 text-sm text-gray-500">Track upcoming and completed rounds.</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          <Tabs
            selectedKey={segment}
            onSelectionChange={(key) => {
              setSegment(key as (typeof SEGMENTS)[number]['key']);
              setPageAndReset(1);
            }}
            aria-label="Interview segments"
            color="primary"
            variant="underlined"
            classNames={{
              tabList: 'gap-6',
              cursor: 'w-full',
              tab: 'px-2',
            }}
          >
            {SEGMENTS.map((item) => (
              <Tab key={item.key} title={item.label} />
            ))}
          </Tabs>
        </div>

        {renderControls()}

        <div className={clsx('mt-5', loading ? 'space-y-4' : 'space-y-4')}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <InterviewSkeleton key={index} />)
          ) : error ? (
            <div className="rounded-2xl border border-danger-100 bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-lg font-bold text-danger">Could not load interviews</h2>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <Button color="primary" variant="flat" className="mt-5" onPress={fetchInterviews}>
                Retry
              </Button>
            </div>
          ) : interviews.length ? (
            <>
              <div className="grid gap-4">
                {interviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>

              {renderPagination()}
            </>
          ) : (
            <EmptyState hasFilters={hasActiveFilters} />
          )}
        </div>
      </div>
    </>
  );
};

export default withCandidateAuth(Page);
