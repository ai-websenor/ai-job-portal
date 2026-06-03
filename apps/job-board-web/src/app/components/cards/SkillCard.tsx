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
  yearsOfExperience?: string | number;
  experienceMonths?: string | number;
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
  experienceMonths,
  onEdit,
  onDelete,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const formatExperience = (yearsValue?: string | number, monthsValue?: string | number) => {
    if (
      (yearsValue === undefined || yearsValue === null || yearsValue === '') &&
      (monthsValue === undefined || monthsValue === null || monthsValue === '')
    ) {
      return '';
    }

    const years = Number(yearsValue ?? 0);
    const months = Number(monthsValue ?? 0);

    if (Number.isFinite(years) && Number.isFinite(months)) {
      const parts: string[] = [];

      if (years > 0) {
        parts.push(`${years} year${years === 1 ? '' : 's'}`);
      }

      if (months > 0) {
        parts.push(`${months} month${months === 1 ? '' : 's'}`);
      }

      if (parts.length === 0) {
        parts.push('0 years');
      }

      return `${parts.join(' ')} of experience`;
    }

    const numericValue = Number(yearsValue);

    if (!Number.isFinite(numericValue)) {
      return `${yearsValue} years of experience`;
    }

    const derivedYears = Math.floor(numericValue);
    const derivedMonths = Math.round((numericValue - derivedYears) * 12);
    const parts: string[] = [];

    if (derivedYears > 0) {
      parts.push(`${derivedYears} year${derivedYears === 1 ? '' : 's'}`);
    }

    if (derivedMonths > 0) {
      parts.push(`${derivedMonths} month${derivedMonths === 1 ? '' : 's'}`);
    }

    if (parts.length === 0) {
      parts.push('0 years');
    }

    return `${parts.join(' ')} of experience`;
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_SKILL(id));
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
        <div className="font-medium">{skillName}</div>
        {proficiencyLevel && (
          <div className="text-sm text-gray-600">{CommUtils.keyIntoTitle(proficiencyLevel)}</div>
        )}
        {yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== '' && (
          <div className="text-sm text-gray-600">
            {formatExperience(yearsOfExperience, experienceMonths)}
          </div>
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
