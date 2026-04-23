import { ICertification } from '@/app/types/types';
import dayjs from 'dayjs';
import { BiTrash } from 'react-icons/bi';
import { MdModeEditOutline } from 'react-icons/md';

interface Props extends ICertification {
  onEdit?: () => void;
  onDelete: () => void;
}

const CertificationCard = ({
  name,
  issuingOrganization,
  issueDate,
  expiryDate,
  onDelete,
  onEdit,
}: Props) => {
  return (
    <div className="bg-gray-50 p-5 rounded-lg flex items-start justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-600">{issuingOrganization}</div>
        <div className="text-sm text-gray-400">
          {dayjs(issueDate).format('MMM YYYY')} -{' '}
          {expiryDate ? dayjs(expiryDate).format('MMM YYYY') : 'No expiry'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onEdit && (
          <button type="button" onClick={onEdit}>
            <MdModeEditOutline size={18} className="text-primary" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete}>
            <BiTrash size={18} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CertificationCard;
