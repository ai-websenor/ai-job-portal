import { transactionListFilterDefaultValues } from '@/app/config/data';
import { TransactionProvider, TransactionStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import { Button, Select, SelectItem } from '@heroui/react';
import { useState } from 'react';

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

type Props = {
  handleApply: (filters: typeof transactionListFilterDefaultValues) => void;
};

const TransactionListFilters = ({ handleApply }: Props) => {
  const [filters, setFilters] = useState(transactionListFilterDefaultValues);

  const handleChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex justify-end flex-wrap items-end gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-3">
      <Select
        label="Status"
        fullWidth={false}
        placeholder="Select status"
        labelPlacement="outside"
        selectedKeys={new Set([filters.status])}
        onSelectionChange={(ev) => handleChange('status', ev.currentKey!)}
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
        selectedKeys={new Set([filters.provider])}
        onSelectionChange={(ev) => handleChange('provider', ev.currentKey!)}
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
        <Button
          onPress={() => handleApply(filters)}
          size="sm"
          color="primary"
          className="font-medium px-4"
        >
          Apply
        </Button>
        <Button
          onPress={() => handleApply(transactionListFilterDefaultValues)}
          size="sm"
          variant="flat"
          color="default"
          className="font-medium px-4"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default TransactionListFilters;
