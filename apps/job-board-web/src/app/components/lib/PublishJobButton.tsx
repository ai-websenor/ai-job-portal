import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { addToast, Button } from '@heroui/react';
import { useState } from 'react';
import { HiOutlineGlobeAlt } from 'react-icons/hi';

type Props = {
  jobId: string;
  refetch: () => void;
};

const PublishJobButton = ({ jobId, refetch }: Props) => {
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.EMPLOYER.JOBS.PUBLISH(jobId), {});
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Job published successfully',
      });
      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      color="success"
      isLoading={loading}
      onPress={handlePublish}
      className="text-white"
      startContent={<HiOutlineGlobeAlt size={16} />}
    >
      Publish Job
    </Button>
  );
};

export default PublishJobButton;
