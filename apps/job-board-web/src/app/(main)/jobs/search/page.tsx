'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, DrawerBody, DrawerContent } from '@heroui/react';
import { IJob } from '@/app/types/types';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { HiFilter } from 'react-icons/hi';
import { searchJobDefaultValues } from '@/app/config/data';
import usePagination from '@/app/hooks/usePagination';
import JobSearchHeader from '@/app/components/job-search/JobSearchHeader';
import JobFilterSection from '@/app/components/job-search/JobFilterSection';
import JobsSection from '@/app/components/job-search/JobsSection';
import JobSearchRightSection from '@/app/components/job-search/JobSearchRightSection';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import JobAlertDialog from '@/app/components/job-alerts/JobAlertDialog';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoNotificationsOutline } from 'react-icons/io5';

const Page = () => {
  const router = useRouter();
  const searchedParams = useSearchParams();
  const { getLocalStorage } = useLocalStorage();

  const [jobs, setJobs] = useState<IJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);
  const [filters, setFilters] = useState(searchJobDefaultValues);

  const { page, setTotalPages, renderPagination } = usePagination();

  const searchJobs = useCallback(
    async (currentFilters = filters, targetPage = page) => {
      const params: any = {
        page: targetPage,
        limit: 10,
      };

      const multiValueFields = [
        'companyType',
        'department',
        'experienceLevels',
        'industry',
        'jobType',
        'locationType',
        'payRate',
        'salaryRange',
        'workModes',
      ];

      for (const key in currentFilters) {
        const value =
          currentFilters[key as keyof typeof searchJobDefaultValues];

        if (!value || (Array.isArray(value) && value.length === 0)) continue;

        if (multiValueFields.includes(key) && Array.isArray(value)) {
          params[key] = value.join(',');
        } else {
          params[key] = value;
        }
      }

      try {
        setLoading(true);

        const response: any = await http.get(
          ENDPOINTS.JOBS.SEARCH,
          { params }
        );

        if (response?.data) {
          setJobs(response.data);
          setTotalPages(response.pagination?.pageCount || 0);
          setTotalJobs(response.pagination?.totalJob || 0);
        }
      } catch (error) {
        console.log('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
        setIsFilterOpen(false);
      }
    },
    [filters, page, setTotalPages],
  );

  useEffect(() => {
    searchJobs();
  }, [page]);

  useEffect(() => {
    const query = searchedParams.get('query') ?? '';
    const location = searchedParams.get('location') ?? '';

    if (query || location) {
      setFilters({
        ...filters,
        query,
        location,
      });

      searchJobs(
        {
          ...filters,
          query,
          location,
        },
        1,
      );
    }
  }, [searchedParams]);

  const handleApplyFilters = () => {
    searchJobs(filters, 1);

    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const handleResetFilters = () => {
    setFilters(searchJobDefaultValues);
    searchJobs(searchJobDefaultValues, 1);
  };

  const handleOpenSaveAlert = () => {
    if (!getLocalStorage('token')) {
      router.push(routePaths.auth.login);
      return;
    }

    setIsSaveAlertOpen(true);
  };

  return (
    <>
      <title>Job Search</title>

      <div className="h-full bg-gray-50">
        <JobSearchHeader
          form={filters}
          setForm={setFilters}
          onSearch={handleApplyFilters}
        />

        <div className="container mx-auto my-8 px-4">
          <div className="flex gap-8 items-start relative">

            {/* LEFT FILTER SECTION */}
            <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 self-start h-[calc(100vh-110px)] overflow-y-auto">
              <JobFilterSection
                applyFilters={handleApplyFilters}
                form={filters}
                setForm={setFilters}
                reset={handleResetFilters}
              />
            </div>

            {/* CENTER JOBS SECTION */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-600 font-medium">
                  Showing {totalJobs} results
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="flat"
                    color="primary"
                    startContent={<IoNotificationsOutline size={18} />}
                    onPress={handleOpenSaveAlert}
                  >
                    Save Search
                  </Button>

                  <Button
                    className="lg:hidden"
                    variant="flat"
                    color="primary"
                    startContent={<HiFilter size={18} />}
                    onPress={() => setIsFilterOpen(true)}
                  >
                    Filters
                  </Button>
                </div>
              </div>

              {loading ? (
                <LoadingProgress />
              ) : jobs?.length > 0 ? (
                <>
                  <div className="flex flex-col gap-6">
                    <JobsSection
                      jobs={jobs}
                      refetch={searchJobs}
                    />
                  </div>

                  <div className="mt-8">
                    {renderPagination()}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="text-6xl mb-4">🔍</div>

                  <h3 className="text-xl font-bold text-gray-800">
                    No jobs found
                  </h3>

                  <p className="text-gray-500 mt-2">
                    Try adjusting your search criteria
                  </p>

                  <Button
                    color="primary"
                    variant="flat"
                    className="mt-4"
                    onPress={handleResetFilters}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE SECTION */}
            <div className="hidden xl:block w-[300px] shrink-0 sticky top-24 self-start">
              <JobSearchRightSection onSaveAlert={handleOpenSaveAlert} />
            </div>
          </div>
        </div>

        {/* MOBILE FILTER DRAWER */}
        <Drawer
          isOpen={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          placement="left"
          size="xs"
        >
          <DrawerContent>
            {() => (
              <DrawerBody className="p-0 overflow-y-auto">
                <JobFilterSection
                  applyFilters={handleApplyFilters}
                  form={filters}
                  setForm={setFilters}
                  reset={handleResetFilters}
                />
              </DrawerBody>
            )}
          </DrawerContent>
        </Drawer>

        {isSaveAlertOpen && (
          <JobAlertDialog
            mode="create"
            isOpen={isSaveAlertOpen}
            filters={filters}
            onClose={() => setIsSaveAlertOpen(false)}
            onSaved={() => setIsSaveAlertOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default Page;
