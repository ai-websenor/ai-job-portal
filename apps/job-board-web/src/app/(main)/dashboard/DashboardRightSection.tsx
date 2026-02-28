import SavedJobsWidget from '@/app/components/dashboard/SavedJobsWidget';
import CareerToolsWidget from '@/app/components/dashboard/CareerToolsWidget';

const DashboardRightSection = () => {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <SavedJobsWidget />
      <CareerToolsWidget />
    </div>
  );
};

export default DashboardRightSection;
