import { Button, DatePicker, Input, Select, SelectItem } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { parseDate } from '@internationalized/date';
import CommonUtils from '@/app/utils/commonUtils';

type FilterType = {
  status: string;
  fromDate: string | null;
  toDate: string | null;
  candidateName: string;
};

type Props = {
  filters: FilterType & Record<string, any>;
  handleApply: () => void;
  handleReset: () => void;
  setFilters: (filters: any) => void;
};

const statusOptions = ['scheduled', 'completed', 'canceled', 'rescheduled'];

const InterviewsListFilters = ({ filters, setFilters, handleApply, handleReset }: Props) => {
  const setDateFilter = (key: 'fromDate' | 'toDate', value: any) => {
    setFilters({
      ...filters,
      [key]: value ? value.toString() : null,
    });
  };

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

      <div className="flex-1 min-w-[180px] items-center">
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
        <I18nProvider locale="en-GB">
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker
              label="From"
              labelPlacement="outside"
              classNames={{
                label: 'font-semibold text-gray-700 pb-1 text-sm',
                inputWrapper: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
              }}
              value={filters.fromDate ? parseDate(filters.fromDate) : null}
              hideTimeZone
              onChange={(value) => setDateFilter('fromDate', value)}
              maxValue={filters.toDate ? parseDate(filters.toDate) : undefined}
              showMonthAndYearPickers
            />

            <DatePicker
              label="To"
              labelPlacement="outside"
              classNames={{
                label: 'font-semibold text-gray-700 pb-1 text-sm',
                inputWrapper: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
              }}
              value={filters.toDate ? parseDate(filters.toDate) : null}
              hideTimeZone
              onChange={(value) => setDateFilter('toDate', value)}
              minValue={filters.fromDate ? parseDate(filters.fromDate) : undefined}
              showMonthAndYearPickers
            />
          </div>
        </I18nProvider>
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
