"use client";

import withAuth from "@/app/hoc/withAuth";
import EmployeeDashboardLeftSection from "./EmployeeDashboardLeftSection";
import EmployeeDashboardRightSection from "./EmployeeDashboardRightSection";

const page = () => {
  return (
    <>
      <title>Dashboard</title>
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 py-8 px-4 md:px-6">
        <EmployeeDashboardLeftSection />
        <div className="md:col-span-2 xl:col-span-3">
          <EmployeeDashboardRightSection />
        </div>
      </div>
    </>
  );
};

export default withAuth(page);
