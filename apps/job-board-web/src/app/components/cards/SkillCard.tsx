import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CommUtils from '@/app/utils/commonUtils';
import { useState } from 'react';
import { BiTrash } from 'react-icons/bi';
import LoadingProgress from '../lib/LoadingProgress';
import { MdModeEditOutline } from 'react-icons/md';

type Props = {
  id: string;
  skillName: string;
  proficiencyLevel: string;
  yearsOfExperience?: string;
  refetch?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
};

const SkillCard = ({
  id,
  refetch,
  skillName,
  proficiencyLevel,
  yearsOfExperience,
  onEdit,
  onDelete,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_SKILL(id));
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
        <div className="font-medium">{skillName}</div>
        {proficiencyLevel && (
          <div className="text-sm text-gray-600">{CommUtils.keyIntoTitle(proficiencyLevel)}</div>
        )}
        {Number(yearsOfExperience) > 0 && (
          <div className="text-sm text-gray-600">{yearsOfExperience} years of experience</div>
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

export default SkillCard;
