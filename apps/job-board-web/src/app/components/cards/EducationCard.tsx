import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { useState } from 'react';
import { BiTrash } from 'react-icons/bi';
import LoadingProgress from '../lib/LoadingProgress';
import { IEducationRecord } from '@/app/types/types';

type Props = {
  education: IEducationRecord;
  refetch?: () => void;
};

const EducationCard = ({ education, refetch }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_EDUCATION(education?.id));
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-5 rounded-lg flex items-start justify-between">
      <div>
        <p className="font-medium">{education?.degree}</p>
        <p className="text-xs text-gray-500 my-1 italic">{education?.institution}</p>
        <p className="text-sm text-gray-400">
          {education?.startDate} - {education?.endDate}
        </p>
      </div>
      {loading ? (
        <LoadingProgress />
      ) : (
        <button onClick={handleDelete} type="button">
          <BiTrash size={18} className="text-red-500" />
        </button>
      )}
    </div>
  );
};

export default EducationCard;
