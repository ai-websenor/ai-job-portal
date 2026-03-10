import { interviewListFilterDefaultValues } from '@/app/config/data';

type FilterType = typeof interviewListFilterDefaultValues;

type Props = {
  filters: FilterType;
  setFilters: (filters: FilterType) => void;
};

const InterviewsListFilters = ({ filters, setFilters }: Props) => {
  return <div className="mb-4 mt-2">InterviewsListFilters</div>;
};

export default InterviewsListFilters;
