import EmployeeProfileCard from '@/app/components/employee-dashboard/EmployeeProfileCard';

const EmployeeDashboardLeftSection = () => {
  return (
    <div className="flex flex-col gap-6 h-fit sm:sticky sm:top-24">
      <EmployeeProfileCard />
    </div>
  );
};

export default EmployeeDashboardLeftSection;
