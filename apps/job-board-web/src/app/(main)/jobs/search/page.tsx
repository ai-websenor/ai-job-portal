"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Drawer, DrawerBody, DrawerContent } from "@heroui/react";
import { IJob } from "@/app/types/types";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import { HiFilter } from "react-icons/hi";
import { searchJobDefaultValues } from "@/app/config/data";
import usePagination from "@/app/hooks/usePagination";
import JobSearchHeader from "@/app/components/job-search/JobSearchHeader";
import JobFilterSection from "@/app/components/job-search/JobFilterSection";
import JobsSection from "@/app/components/job-search/JobsSection";
import JobSearchRightSection from "@/app/components/job-search/JobSearchRightSection";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import { useSearchParams } from "next/navigation";

const Page = () => {
  const searchedParams = useSearchParams();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(searchJobDefaultValues);
  const { page, setTotalPages, renderPagination } = usePagination();

  const searchJobs = useCallback(
    async (currentFilters = filters, targetPage = page) => {
      const params: any = { page: targetPage, limit: 10 };

      for (const key in currentFilters) {
        const value =
          currentFilters[key as keyof typeof searchJobDefaultValues];

        if (["experienceLevels", "jobType", "workModes"].includes(key)) {
          if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(",");
          }
        } else if (value) {
          params[key] = value;
        }
      }

      try {
        setLoading(true);
        const response: any = await http.get(ENDPOINTS.JOBS.SEARCH, { params });

        if (response?.data) {
          setJobs(response.data);
          setTotalPages(response.pagination?.pageCount || 0);
          setTotalJobs(response.pagination?.totalJob || 0);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
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
    const query = searchedParams.get("query") ?? "";
    const location = searchedParams.get("location") ?? "";

    if (query || location) {
      setFilters({ ...filters, query, location });
      searchJobs({ ...filters, query, location }, 1);
    }
  }, [searchedParams]);

  const handleApplyFilters = () => {
    searchJobs(filters, 1);
  };

  const handleResetFilters = () => {
    setFilters(searchJobDefaultValues);
    searchJobs(searchJobDefaultValues, 1);
  };

  return (
    <>
      <title>Job Search</title>
      <div className="h-full">
        <JobSearchHeader
          form={filters}
          setForm={setFilters}
          onSearch={handleApplyFilters}
        />
        <div className="container mx-auto my-8 px-4 flex flex-col lg:flex-row gap-8 relative items-start">
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <JobFilterSection
              applyFilters={handleApplyFilters}
              form={filters}
              setForm={setFilters}
              reset={handleResetFilters}
            />
          </div>

          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p>Showing {totalJobs} results</p>
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

            {loading ? (
              <LoadingProgress />
            ) : jobs?.length > 0 ? (
              <div className="flex flex-col gap-6">
                <JobsSection jobs={jobs} refetch={searchJobs} />
                <div className="py-4">{renderPagination()}</div>
              </div>
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

          <div className="hidden xl:block w-[300px] flex-shrink-0">
            <JobSearchRightSection />
          </div>
        </div>

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
      </div>
    </>
  );
};

export default Page;
