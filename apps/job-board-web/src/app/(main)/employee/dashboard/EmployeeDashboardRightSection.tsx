import EmployeeAnalyticsSection from "@/app/components/employee-dashboard/EmployeeAnalyticsSection";
import EmployeeChartSection from "@/app/components/employee-dashboard/EmployeeChartSection";
import Image from "next/image";

const EmployeeDashboardRightSection = () => {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400">
          Welcome back! Here's your hiring overview.
        </p>
      </div>
      <EmployeeAnalyticsSection />
      <EmployeeChartSection />
      <Image
        src={"/assets/images/employee-dashboard.png"}
        alt="Employee Dashboard"
        width={1000}
        height={1000}
        className="w-full h-auto rounded-lg"
      />
    </div>
  );
};

export default EmployeeDashboardRightSection;
