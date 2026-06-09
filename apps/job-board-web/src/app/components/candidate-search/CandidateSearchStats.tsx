'use client';

import { Button } from '@heroui/react';
import { FiArrowRight, FiBriefcase, FiCheckCircle, FiSearch, FiStar, FiUsers } from 'react-icons/fi';
import useCandidateSearchStore from '@/app/store/useCandidateSearchStore';

const statCards = [
  {
    title: 'Matching Candidates',
    icon: FiUsers,
    tone: 'text-blue-600 bg-blue-50',
    getValue: (state: ReturnType<typeof useCandidateSearchStore.getState>) =>
      state.pagination.totalCandidate,
    action: 'Search',
  },
  {
    title: 'Shortlisted',
    icon: FiStar,
    tone: 'text-emerald-600 bg-emerald-50',
    getValue: (state: ReturnType<typeof useCandidateSearchStore.getState>) =>
      state.savedPagination.totalCandidate,
    action: 'Saved',
  },
  {
    title: 'Active Filters',
    icon: FiSearch,
    tone: 'text-primary bg-secondary',
    getValue: (state: ReturnType<typeof useCandidateSearchStore.getState>) =>
      [
        state.filters.query,
        state.filters.location,
        state.filters.salaryMin,
        state.filters.salaryMax,
        ...state.filters.experienceLevels,
        ...state.filters.employmentTypes,
        ...state.filters.availability,
        ...state.filters.skillIds,
      ].filter(Boolean).length,
    action: 'Refine',
  },
  {
    title: 'Current Page',
    icon: FiBriefcase,
    tone: 'text-orange-600 bg-orange-50',
    getValue: (state: ReturnType<typeof useCandidateSearchStore.getState>) =>
      state.pagination.currentPage || 1,
    action: 'Browse',
  },
  {
    title: 'Total Pages',
    icon: FiCheckCircle,
    tone: 'text-violet-600 bg-violet-50',
    getValue: (state: ReturnType<typeof useCandidateSearchStore.getState>) =>
      state.pagination.pageCount,
    action: 'Navigate',
  },
];

const CandidateSearchStats = () => {
  const state = useCandidateSearchStore();

  return (
    <div className="container mx-auto -mt-4 grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-5">
      {statCards.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-950">{item.getValue(state)}</p>
                <p className="text-xs font-medium leading-5 text-gray-500">{item.title}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-7 min-w-0 px-0 text-xs font-bold"
              endContent={<FiArrowRight size={14} />}
            >
              {item.action}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default CandidateSearchStats;
