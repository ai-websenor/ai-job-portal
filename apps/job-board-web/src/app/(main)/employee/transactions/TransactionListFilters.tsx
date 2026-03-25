import { TransactionProvider, TransactionStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import { Button, Select, SelectItem } from '@heroui/react';

const statusOptions = [
  { label: 'All', value: '' },
  ...Object.values(TransactionStatus).map((ev) => ({
    label: CommonUtils.keyIntoTitle(ev),
    value: ev,
  })),
];

const providerOptions = [
  { label: 'All', value: '' },
  ...Object.values(TransactionProvider).map((ev) => ({
    label: CommonUtils.keyIntoTitle(ev),
    value: ev,
  })),
];

const TransactionListFilters = () => {
  return (
    <div className="flex justify-end flex-wrap items-end gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-3">
      <Select
        label="Status"
        fullWidth={false}
        placeholder="Select status"
        labelPlacement="outside"
        defaultSelectedKeys={new Set([statusOptions[0].value])}
        classNames={{
          label: 'font-medium text-gray-700 text-sm',
          trigger: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
        }}
      >
        {statusOptions.map((item) => (
          <SelectItem key={item.value ?? ''}>{item.label}</SelectItem>
        ))}
      </Select>

      <Select
        label="Provider"
        fullWidth={false}
        placeholder="Select provider"
        labelPlacement="outside"
        defaultSelectedKeys={new Set([providerOptions[0].value])}
        classNames={{
          label: 'font-medium text-gray-700 text-sm',
          trigger: 'bg-gray-50 border-gray-200 hover:bg-gray-100 shadow-none',
        }}
      >
        {providerOptions.map((item) => (
          <SelectItem key={item.value ?? ''}>{item.label}</SelectItem>
        ))}
      </Select>

      <div className="flex items-center gap-2 pb-0.5">
        <Button size="sm" color="primary" className="font-medium px-4">
          Apply
        </Button>
        <Button size="sm" variant="flat" color="default" className="font-medium px-4">
          Reset
        </Button>
      </div>
    </div>
  );
};

export default TransactionListFilters;
