import { DialogProps } from '@/app/types/types';

interface Props extends DialogProps {
  jobId: string;
}

const ShareJobDialog = ({ isOpen, jobId, onClose }: Props) => {
  return <div>ShareJobDialog</div>;
};

export default ShareJobDialog;
