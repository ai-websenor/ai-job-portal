"use client";

import withAuth from "@/app/hoc/withAuth";
import EmployeeDashboardLeftSection from "./EmployeeDashboardLeftSection";
import EmployeeDashboardRightSection from "./EmployeeDashboardRightSection";

const page = () => {
  return (
    <>
      <title>Dashboard</title>
      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-8 px-4 md:px-6">
        <div className="w-full lg:w-1/4">
          <EmployeeDashboardLeftSection />
        </div>
        <div className="w-full lg:w-3/4">
          <EmployeeDashboardRightSection />
        </div>
      </div>
    </>
  );
};

export default withAuth(page);
