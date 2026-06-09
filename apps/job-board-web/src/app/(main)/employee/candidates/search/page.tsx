'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, DrawerBody, DrawerContent, Select, SelectItem, Tab, Tabs } from '@heroui/react';
import { HiFilter } from 'react-icons/hi';
import { FiLock, FiSearch } from 'react-icons/fi';
import ActiveFilterChips from '@/app/components/candidate-search/ActiveFilterChips';
import CandidateCard from '@/app/components/candidate-search/CandidateCard';
import CandidatePagination from '@/app/components/candidate-search/CandidatePagination';
import CandidateSearchHero from '@/app/components/candidate-search/CandidateSearchHero';
import CandidateSearchRightRail from '@/app/components/candidate-search/CandidateSearchRightRail';
import CandidateSearchStats from '@/app/components/candidate-search/CandidateSearchStats';
import FilterSidebar from '@/app/components/candidate-search/FilterSidebar';
import { candidateLabelMaps, candidateSortOptions } from '@/app/config/candidateSearch';
import withAuth from '@/app/hoc/withAuth';
import useDebouncedValue from '@/app/hooks/useDebouncedValue';
import useCandidateSearchStore from '@/app/store/useCandidateSearchStore';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import type { CandidateSortBy } from '@/app/types/candidateSearch';
import permissionUtils from '@/app/utils/permissionUtils';

const CandidateCardSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex animate-pulse gap-4">
      <div className="h-20 w-20 shrink-0 rounded-full bg-gray-100" />
      <div className="flex-1">
        <div className="h-5 w-44 rounded bg-gray-100" />
        <div className="mt-3 h-4 w-60 rounded bg-gray-100" />
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
        </div>
        <div className="mt-5 flex gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-100" />
          <div className="h-6 w-24 rounded-full bg-gray-100" />
          <div className="h-6 w-16 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ mode, onClear }: { mode: 'search' | 'saved'; onClear?: () => void }) => (
  <div className="rounded-2xl border border-dashed border-primary/20 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl text-primary">
      <FiSearch />
    </div>
    <h2 className="text-xl font-bold text-gray-950">
      {mode === 'saved' ? 'No saved candidates yet' : 'No candidates match your filters'}
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
      {mode === 'saved'
        ? 'Shortlisted candidates will appear here after you save profiles from search results.'
        : 'Try clearing filters, broadening your salary range, or searching for a different skill.'}
    </p>
    {mode === 'search' && onClear && (
      <Button color="primary" variant="flat" onPress={onClear} className="mt-5 font-bold">
        Clear Filters
      </Button>
    )}
  </div>
);

const AccessDenied = () => (
  <div className="container mx-auto px-4 py-16">
    <div className="mx-auto max-w-xl rounded-3xl border border-danger-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-50 text-3xl text-danger">
        <FiLock />
      </div>
      <h1 className="text-2xl font-bold text-gray-950">Candidate search is employer-only</h1>
      <p className="mt-3 text-sm leading-6 text-gray-500">
        Sign in with an employer or super-employer account that has candidate access.
      </p>
    </div>
  </div>
);

const Page = () => {
  const { user } = useUserStore();
  const {
    filters,
    results,
    pagination,
    loading,
    error,
    errorStatus,
    savedResults,
    savedPagination,
    savedLoading,
    savedError,
    fetchSearch,
    fetchSaved,
    resetFilters,
    setFilter,
    setPage,
    setSavedPage,
  } = useCandidateSearchStore();

  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const isEmployer =
    user?.role === Roles.employer || (user as any)?.role === Roles.super_employer;
  const canSearchCandidates = isEmployer && permissionUtils.hasPermission('candidates:read');

  const debouncedQuery = useDebouncedValue(filters.query, 400);
  const debouncedLocation = useDebouncedValue(filters.location, 400);

  const arrayFilterSignature = useMemo(
    () =>
      [
        filters.experienceLevels.join(','),
        filters.employmentTypes.join(','),
        filters.availability.join(','),
        filters.skillIds.join(','),
      ].join('|'),
    [filters.availability, filters.employmentTypes, filters.experienceLevels, filters.skillIds],
  );

  useEffect(() => {
    if (!canSearchCandidates || activeTab !== 'search') return;
    if (filters.query !== debouncedQuery || filters.location !== debouncedLocation) return;

    const controller = new AbortController();
    fetchSearch(undefined, { signal: controller.signal });

    return () => controller.abort();
  }, [
    activeTab,
    arrayFilterSignature,
    canSearchCandidates,
    debouncedLocation,
    debouncedQuery,
    fetchSearch,
    filters.limit,
    filters.location,
    filters.page,
    filters.query,
    filters.salaryMax,
    filters.salaryMin,
    filters.sortBy,
  ]);

  useEffect(() => {
    if (!canSearchCandidates) return;

    const controller = new AbortController();
    fetchSaved(1, { signal: controller.signal });

    return () => controller.abort();
  }, [canSearchCandidates, fetchSaved]);

  useEffect(() => {
    if (!canSearchCandidates || activeTab !== 'saved') return;

    const controller = new AbortController();
    fetchSaved(savedPagination.currentPage || 1, { signal: controller.signal });

    return () => controller.abort();
  }, [
    activeTab,
    canSearchCandidates,
    fetchSaved,
    filters.limit,
    savedPagination.currentPage,
  ]);

  const handleImmediateSearch = () => {
    fetchSearch();
    setIsFilterOpen(false);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderSearchResults = () => {
    if (loading) {
      return (
        <div className="grid gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <CandidateCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      if (errorStatus === 403) return <AccessDenied />;

      return (
        <div className="rounded-2xl border border-danger-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-danger">Could not load candidates</h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button color="primary" variant="flat" onPress={handleImmediateSearch} className="mt-5">
            Try Again
          </Button>
        </div>
      );
    }

    if (!results.length) {
      return <EmptyState mode="search" onClear={resetFilters} />;
    }

    return (
      <>
        <div className="grid gap-5">
          {results.map((candidate) => (
            <CandidateCard key={candidate.profileId} candidate={candidate} />
          ))}
        </div>
        <CandidatePagination
          pagination={pagination}
          limit={filters.limit}
          onChange={(page) => setPage(page)}
        />
      </>
    );
  };

  const renderSavedResults = () => {
    if (savedLoading) {
      return (
        <div className="grid gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <CandidateCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (savedError) {
      return (
        <div className="rounded-2xl border border-danger-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-danger">Could not load saved candidates</h2>
          <p className="mt-2 text-sm text-gray-500">{savedError}</p>
          <Button color="primary" variant="flat" onPress={() => fetchSaved(1)} className="mt-5">
            Try Again
          </Button>
        </div>
      );
    }

    if (!savedResults.length) {
      return <EmptyState mode="saved" />;
    }

    return (
      <>
        <div className="grid gap-5">
          {savedResults.map((candidate) => (
            <CandidateCard key={candidate.profileId} candidate={candidate} />
          ))}
        </div>
        <CandidatePagination
          pagination={savedPagination}
          limit={filters.limit}
          onChange={(page) => setSavedPage(page)}
        />
      </>
    );
  };

  if (!user) {
    return null;
  }

  if (!canSearchCandidates) {
    return <AccessDenied />;
  }

  return (
    <>
      <title>Search Candidates</title>

      <div className="min-h-screen bg-gray-50">
        <CandidateSearchHero onSearch={handleImmediateSearch} />
        <CandidateSearchStats />

        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
            <div className="hidden xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-110px)] overflow-y-auto">
                <FilterSidebar onApply={handleImmediateSearch} />
              </div>
            </div>

            <main className="min-w-0">
              <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={(key) => setActiveTab(key as 'search' | 'saved')}
                  color="primary"
                  variant="underlined"
                  aria-label="Candidate search tabs"
                >
                  <Tab key="search" title={`Search (${pagination.totalCandidate})`} />
                  <Tab key="saved" title={`Saved (${savedPagination.totalCandidate})`} />
                </Tabs>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {activeTab === 'search' && (
                    <Select
                      size="sm"
                      aria-label="Sort candidates"
                      label="Sort by"
                      labelPlacement="outside-left"
                      selectedKeys={new Set([filters.sortBy])}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as CandidateSortBy | undefined;
                        if (value) setFilter('sortBy', value);
                      }}
                      className="w-full sm:w-56"
                      classNames={{
                        trigger: 'bg-white border border-gray-100 shadow-none',
                      }}
                    >
                      {candidateSortOptions.map((item) => (
                        <SelectItem key={item.value}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  )}

                  <Button
                    className="xl:hidden"
                    variant="flat"
                    color="primary"
                    startContent={<HiFilter size={18} />}
                    onPress={() => setIsFilterOpen(true)}
                  >
                    Filters
                  </Button>
                </div>
              </div>

              {activeTab === 'search' && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-500">
                      Showing {results.length} of {pagination.totalCandidate} candidates
                    </p>
                    <p className="text-xs font-semibold text-gray-400">
                      Sorted by {candidateLabelMaps.sortBy[filters.sortBy]}
                    </p>
                  </div>
                  <ActiveFilterChips />
                  {renderSearchResults()}
                </>
              )}

              {activeTab === 'saved' && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-500">
                      {savedPagination.totalCandidate} shortlisted candidates
                    </p>
                    <p className="text-xs font-semibold text-gray-400">
                      Refreshed when this tab opens
                    </p>
                  </div>
                  {renderSavedResults()}
                </>
              )}
            </main>

            <div className="hidden xl:block">
              <div className="sticky top-24">
                <CandidateSearchRightRail />
              </div>
            </div>
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
              <DrawerBody className="p-0">
                <FilterSidebar onApply={handleImmediateSearch} />
              </DrawerBody>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

export default withAuth(Page);
