import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import { useState } from "react";
import { BiTrash } from "react-icons/bi";
import LoadingProgress from "../lib/LoadingProgress";

type Props = {
  id: string;
  degree: string;
  endDate: string;
  startDate: string;
  refetch?: () => void;
};

const EducationCard = ({ id, refetch, degree, startDate, endDate }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_EDUCATION(id));
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
        <div className="font-medium">{degree}</div>
        <div className="text-sm text-gray-400">
          {startDate} - {endDate}
        </div>
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
