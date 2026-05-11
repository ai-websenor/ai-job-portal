import SavedJobsWidget from '@/app/components/dashboard/SavedJobsWidget';

const DashboardRightSection = () => {
  return (
    <div className="flex flex-col w-full h-full">
      <SavedJobsWidget />
    </div>
  );
};

export default DashboardRightSection;
