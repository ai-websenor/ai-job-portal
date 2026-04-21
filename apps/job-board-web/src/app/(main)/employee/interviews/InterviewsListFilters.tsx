import { Button, DateRangePicker, Input, Select, SelectItem } from '@heroui/react';
import { interviewListFilterDefaultValues } from '@/app/config/data';
import CommonUtils from '@/app/utils/commonUtils';

type FilterType = typeof interviewListFilterDefaultValues;

type Props = {
  filters: FilterType;
  handleApply: () => void;
  handleReset: () => void;
  setFilters: (filters: FilterType) => void;
};

const statusOptions = ['scheduled', 'completed', 'canceled', 'rescheduled'];

const InterviewsListFilters = ({ filters, setFilters, handleApply, handleReset }: Props) => {
  return (
    <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-3 mb-6">
      <div className="flex-1 min-w-[200px]">
        <Input
          label="Candidate Name"
          placeholder="Search by candidate name"
          labelPlacement="outside"
          value={filters.candidateName}
          onChange={(e) => setFilters({ ...filters, candidateName: e.target.value })}
          classNames={{
            label: 'font-semibold text-gray-700 pb-1 text-sm',
            inputWrapper: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
          }}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <Select
          label="Status"
          placeholder="Select status"
          labelPlacement="outside"
          selectedKeys={filters.status ? [filters.status] : []}
          onSelectionChange={(keys: any) =>
            setFilters({ ...filters, status: Array.from(keys)[0] as string })
          }
          classNames={{
            label: 'font-semibold text-gray-700 pb-1 text-sm',
            trigger: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
          }}
        >
          {statusOptions.map((status) => (
            <SelectItem key={status}>
              {CommonUtils.keyIntoTitle(status === 'canceled' ? 'cancelled' : status)}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex-[1.5] min-w-[280px]">
        <DateRangePicker
          label="Interview Dates"
          labelPlacement="outside"
          classNames={{
            label: 'font-semibold text-gray-700 pb-1 text-sm',
            inputWrapper: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
          }}
          value={
            filters.fromDate && filters.toDate
              ? { start: filters.fromDate, end: filters.toDate }
              : null
          }
          onChange={(range) => {
            if (range) {
              setFilters({
                ...filters,
                fromDate: range.start as any,
                toDate: range.end as any,
              });
            } else {
              setFilters({
                ...filters,
                fromDate: null,
                toDate: null,
              });
            }
          }}
        />
      </div>

      <div className="flex items-center gap-2 pb-0.5">
        <Button
          size="sm"
          color="primary"
          className="font-medium px-4"
          onPress={() => handleApply()}
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="flat"
          color="default"
          className="font-medium px-4"
          onPress={() => {
            setFilters(interviewListFilterDefaultValues);
            handleReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default InterviewsListFilters;
