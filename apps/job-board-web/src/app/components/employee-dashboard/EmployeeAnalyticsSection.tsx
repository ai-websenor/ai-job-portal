import { employeeDashboardAnalyticsData } from "@/app/config/data";
import EmployeeDashboardAnalyticsCard from "../cards/EmployeeDashboardAnalyticsCard";

const EmployeeAnalyticsSection = () => {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
      {employeeDashboardAnalyticsData.map((item, index) => (
        <EmployeeDashboardAnalyticsCard
          {...item}
          key={index}
          icon={item.icon}
        />
      ))}
    </div>
  );
};

export default EmployeeAnalyticsSection;
