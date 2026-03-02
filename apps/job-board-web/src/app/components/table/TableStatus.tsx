import CommonUtils from '@/app/utils/commonUtils';
import { Chip } from '@heroui/react';

const TableStatus = ({ status }: { status: string }) => {
  return (
    <Chip color={CommonUtils.getStatusColor(status)} size="sm" variant="flat">
      {CommonUtils.keyIntoTitle(status)}
    </Chip>
  );
};

export default TableStatus;
