'use client';

import { Pagination } from '@heroui/react';
import type { CandidatePagination as CandidatePaginationType } from '@/app/types/candidateSearch';

type Props = {
  pagination: CandidatePaginationType;
  onChange: (page: number) => void;
  limit: number;
};

const CandidatePagination = ({ pagination, onChange, limit }: Props) => {
  if (!pagination.pageCount || pagination.pageCount <= 1) return null;

  const start = (pagination.currentPage - 1) * limit + 1;
  const end = Math.min(pagination.currentPage * limit, pagination.totalCandidate);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:flex-row">
      <p className="text-sm font-medium text-gray-500">
        Showing {start}-{end} of {pagination.totalCandidate} candidates
      </p>
      <Pagination
        aria-label="Candidate pagination"
        total={pagination.pageCount}
        page={pagination.currentPage || 1}
        onChange={onChange}
        color="primary"
        variant="flat"
        showControls
      />
    </div>
  );
};

export default CandidatePagination;
