import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { useState } from 'react';
import { BiTrash } from 'react-icons/bi';
import LoadingProgress from '../lib/LoadingProgress';
import { IEducationRecord } from '@/app/types/types';
import { MdModeEditOutline } from 'react-icons/md';
import dayjs from 'dayjs';

type Props = {
  education: IEducationRecord;
  refetch?: () => void;
  onEdit?: (education: IEducationRecord) => void;
  onDelete?: () => void;
};

const EducationCard = ({ education, refetch, onEdit, onDelete }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_EDUCATION(education?.id));
      refetch?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('updateProfile'));
      }
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
        {education?.startDate && (
          <p className="text-sm text-gray-400">
            {dayjs(education?.startDate).format('MMM YYYY')} -{' '}
            {education?.currentlyStudying
              ? 'Currently Studying'
              : education?.endDate
                ? dayjs(education?.endDate).format('MMM YYYY')
                : ''}
          </p>
        )}
      </div>
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button type="button" onClick={() => onEdit(education)}>
              <MdModeEditOutline size={18} className="text-primary" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onDelete) {
                onDelete();
              } else {
                handleDelete();
              }
            }}
          >
            <BiTrash size={18} className="text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EducationCard;
