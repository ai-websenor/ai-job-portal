import { DialogProps, IInterview } from '@/app/types/types';

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const RescheduleInterviewDialog = ({ isOpen, onClose, interview }: Props) => {
  return <div>RescheduleInterviewDialog</div>;
};

export default RescheduleInterviewDialog;
