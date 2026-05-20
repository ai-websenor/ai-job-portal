import CandidateJobGroups from '@/app/components/dashboard/CandidateJobGroups';
import RecommendedJobs from '@/app/components/dashboard/RecommendedJobs';

const DashboardMainSection = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <CandidateJobGroups />
      <RecommendedJobs />
    </div>
  );
};

export default DashboardMainSection;
