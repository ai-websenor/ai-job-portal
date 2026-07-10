import CommonUtils from '@/app/utils/commonUtils';
import { Chip } from '@heroui/react';

const SupportStatus = ({ status, type = 'status' }: { status: string; type?: 'status' | 'priority' }) => {
  const color =
    type === 'status'
      ? CommonUtils.getSupportStatusColor(status)
      : CommonUtils.getSupportPriorityColor(status);

  return (
    <Chip color={color as any} size="sm" variant="flat">
      {CommonUtils.keyIntoTitle(status)}
    </Chip>
  );
};

export default SupportStatus;
