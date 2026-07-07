'use client';

import { Pagination } from '@heroui/react';
import ItemsPerPageSelect from './ItemsPerPageSelect';

type Props = {
  label?: string;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

const TablePagination = ({
  label = 'jobs',
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  pageSizeOptions = [5, 10, 15, 20],
  onPageChange,
  onPageSizeChange,
}: Props) => {
  const start = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-default-200 px-4 py-4 sm:flex-row">
      <p className="text-sm font-medium text-default-500">
        {totalItems > 0
          ? `Showing ${start} to ${end} of ${totalItems} ${label}`
          : `No ${label} to show`}
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

      <div className="flex items-center gap-2 text-sm text-default-600">
        {onPageSizeChange ? (
          <>
            <span className="whitespace-nowrap">Items per page</span>
            <ItemsPerPageSelect
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2">
            <span>{pageSize} per page</span>
            <span className="text-default-400">|</span>
            <span>{totalPages} pages</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TablePagination;
