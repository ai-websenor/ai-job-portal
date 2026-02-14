import RecommendedJobs from "@/app/components/dashboard/RecommendedJobs";
import ApplicationTracker from "@/app/components/dashboard/ApplicationTracker";

const DashboardMainSection = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <RecommendedJobs />
      <ApplicationTracker />
    </div>
  );
};

export default DashboardMainSection;
