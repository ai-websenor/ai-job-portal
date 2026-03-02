import { ICertification } from '@/app/types/types';
import dayjs from 'dayjs';
import { BiTrash } from 'react-icons/bi';

interface Props extends ICertification {
  onDelete: () => void;
}

const CertificationCard = ({
  name,
  issuingOrganization,
  issueDate,
  expiryDate,
  onDelete,
}: Props) => {
  return (
    <div className="bg-gray-50 p-5 rounded-lg flex items-start justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-600">{issuingOrganization}</div>
        <div className="text-sm text-gray-400">
          {dayjs(issueDate).format('MMM YYYY')} - {dayjs(expiryDate).format('MMM YYYY')}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (onDelete) {
              onDelete();
            }
          }}
          type="button"
        >
          <BiTrash size={18} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default CertificationCard;
