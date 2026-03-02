import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CommUtils from '@/app/utils/commonUtils';
import { useState } from 'react';
import { BiTrash } from 'react-icons/bi';
import LoadingProgress from '../lib/LoadingProgress';
import { MdModeEditOutline } from 'react-icons/md';

type Props = {
  id: string;
  title?: string;
  designation?: string;
  companyName?: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  achievements?: string;
  skillsUsed?: string;
  refetch?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

const WorkExperienceCard = ({
  id,
  title,
  designation,
  companyName,
  employmentType,
  location,
  startDate,
  endDate,
  isCurrent,
  description,
  achievements,
  skillsUsed,
  refetch,
  onEdit,
  onDelete,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_EXPERIENCE(id));
      refetch?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-5 rounded-lg flex items-start justify-between border border-gray-100">
      <div className="flex flex-col gap-1">
        <h4 className="font-bold text-lg text-gray-900">{title}</h4>
        <p className="font-medium text-gray-700">
          {designation} • {companyName}
        </p>

        <div className="text-sm text-gray-500">
          <span>{CommUtils.keyIntoTitle(employmentType as string)}</span>
          {location && <span> | {location}</span>}
        </div>

        <div className="text-sm text-gray-500">
          {startDate} - {isCurrent ? 'Present' : endDate}
        </div>

        {description && (
          <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
            {description}
          </p>
        )}

        {achievements && (
          <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
            {achievements}
          </p>
        )}

        {skillsUsed && (
          <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
            {skillsUsed}
          </p>
        )}
      </div>

      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button type="button" onClick={onEdit}>
              <MdModeEditOutline size={18} className="text-primary" />
            </button>
          )}
          <button
            onClick={() => {
              if (onDelete) {
                onDelete();
              } else {
                handleDelete();
              }
            }}
            type="button"
          >
            <BiTrash size={18} className="text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkExperienceCard;
