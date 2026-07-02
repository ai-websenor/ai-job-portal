'use client';

import { Pagination, Select, SelectItem } from '@heroui/react';

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

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

const TablePagination = ({
  label = 'jobs',
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
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
            <Select
              aria-label="Items per page"
              size="sm"
              className="w-[84px]"
              selectedKeys={[String(pageSize)]}
              disallowEmptySelection
              onSelectionChange={(keys: any) => {
                const next = Number(Array.from(keys)[0]);
                if (next && next !== pageSize) onPageSizeChange(next);
              }}
              classNames={{
                trigger: 'bg-default-50 border border-default-200 shadow-none min-h-9 h-9',
              }}
            >
              {pageSizeOptions.map((size) => (
                <SelectItem key={String(size)}>{String(size)}</SelectItem>
              ))}
            </Select>
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
