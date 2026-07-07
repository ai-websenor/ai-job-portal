'use client';

import { Select, SelectItem } from '@heroui/react';

type Props = {
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  ariaLabel?: string;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

const ItemsPerPageSelect = ({
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  className = 'w-[84px]',
  ariaLabel = 'Items per page',
}: Props) => {
  return (
    <Select
      aria-label={ariaLabel}
      size="sm"
      className={className}
      selectedKeys={[String(pageSize)]}
      disallowEmptySelection
      onSelectionChange={(keys: any) => {
        const next = Number(Array.from(keys)[0]);
        if (next && next !== pageSize) {
          onPageSizeChange?.(next);
        }
      }}
      classNames={{
        trigger: 'bg-default-50 border border-default-200 shadow-none min-h-9 h-9',
      }}
    >
      {pageSizeOptions.map((size) => (
        <SelectItem key={String(size)}>{String(size)}</SelectItem>
      ))}
    </Select>
  );
};

export default ItemsPerPageSelect;
