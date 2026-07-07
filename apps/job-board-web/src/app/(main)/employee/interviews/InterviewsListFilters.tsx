import { Button, Input, Select, SelectItem } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { parseDate } from '@internationalized/date';
import CommonUtils from '@/app/utils/commonUtils';
import { FiCalendar, FiFilter, FiSearch } from 'react-icons/fi';
import AppDateRangePicker from '@/app/components/lib/AppDateRangePicker';

type FilterType = {
  status: string;
  interviewMode: string;
  fromDate: string | null;
  toDate: string | null;
  search: string;
};

type Props = {
  filters: FilterType & Record<string, any>;
  handleReset: () => void;
  setFilters: (filters: any) => void;
};

const statusOptions = ['scheduled', 'completed', 'canceled', 'rescheduled'];
const interviewModeOptions = [
  { key: 'online', label: 'Online' },
  { key: 'on_site', label: 'On-site' },
  { key: 'phone', label: 'Phone' },
];

const InterviewsListFilters = ({ filters, setFilters, handleReset }: Props) => {
  const dateRangeValue =
    filters.fromDate && filters.toDate
      ? {
        start: parseDate(filters.fromDate),
        end: parseDate(filters.toDate),
      }
      : null;

  return (
    <div className="mt-3 mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 lg:max-w-[220px]">
            <Select
              label="All Status"
              labelPlacement="outside"
              placeholder="All Status"
              selectedKeys={filters.status ? [filters.status] : []}
              onSelectionChange={(keys: any) =>
                setFilters({ ...filters, status: String(Array.from(keys)[0] || '') })
              }
              classNames={{
                label: 'font-semibold text-gray-600',
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

          <div className="min-w-[260px] flex-[1.5] lg:max-w-[360px]">
            <I18nProvider locale="en-GB">
              <AppDateRangePicker
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar size={14} />
                    Date Range
                  </span>
                }
                labelPlacement="outside"
                value={dateRangeValue as any}
                onChange={(value: any) => {
                  if (!value) {
                    setFilters({
                      ...filters,
                      fromDate: null,
                      toDate: null,
                    });
                    return;
                  }

                  setFilters({
                    ...filters,
                    fromDate: value.start ? value.start.toString() : null,
                    toDate: value.end ? value.end.toString() : null,
                  });
                }}
                hideTimeZone
                showMonthAndYearPickers
                classNames={{
                  label: 'font-semibold text-gray-600',
                  inputWrapper: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
                  separator: 'text-gray-400',
                  selectorButton: 'text-gray-500',
                }}
              />
            </I18nProvider>
          </div>

          <div className="min-w-[180px] flex-1 lg:max-w-[220px]">
            <Select
              label="All Interview Types"
              labelPlacement="outside"
              placeholder="All Interview Types"
              selectedKeys={filters.interviewMode ? [filters.interviewMode] : []}
              onSelectionChange={(keys: any) =>
                setFilters({ ...filters, interviewMode: String(Array.from(keys)[0] || '') })
              }
              classNames={{
                label: 'font-semibold text-gray-600',
                trigger: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
              }}
            >
              {interviewModeOptions.map((mode) => (
                <SelectItem key={mode.key}>{mode.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <Button
              size="sm"
              variant="flat"
              color="default"
              startContent={<FiFilter size={14} />}
              className="font-medium px-4 text-primary"
              onPress={() => {
                handleReset();
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="w-full lg:max-w-[360px] lg:shrink-0">
          <Input
            placeholder="Search by candidate name or job role..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            startContent={<FiSearch size={16} className="text-gray-400" />}
            classNames={{
              label: 'font-semibold text-gray-600',
              inputWrapper:
                "bg-gray-50 border border-black/20 shadow-none hover:bg-gray-100 data-[focus=true]:border-primary transition-colors",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default InterviewsListFilters;
