'use client';

import { Pagination } from '@heroui/react';

type Props = {
  label?: string;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

const TablePagination = ({
  label = 'jobs',
  totalItems = 32,
  currentPage = 1,
  totalPages = 5,
  pageSize = 7,
  onPageChange,
}: Props) => {
  const start = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-default-200 px-4 py-4 sm:flex-row">
      <p className="text-sm font-medium text-default-500">
        {totalItems > 0 ? `Showing ${start} to ${end} of ${totalItems} ${label}` : `No ${label} to show`}
      </p>

      <Pagination
        aria-label={`${label} pagination`}
        total={Math.max(1, totalPages)}
        page={currentPage}
        onChange={onPageChange}
        color="primary"
        variant="flat"
        showControls
      />

      <div className="flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-sm text-default-600">
        <span>{pageSize} per page</span>
        <span className="text-default-400">|</span>
        <span>{totalPages} pages</span>
      </div>
    </div>
  );
};

export default TablePagination;
