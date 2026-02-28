"use client";

import withAuth from "@/app/hoc/withAuth";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import EmployeeProfileLeftSection from "./EmployeeProfileLeftSection";
import EmployeePersonalDetails from "@/app/components/employee-profile/EmployeePersonalDetails";
import EmployeeCompanyDetails from "@/app/components/employee-profile/EmployeeCompanyDetails";

const page = () => {
  const params = useSearchParams();
  const defaultTab = params.get("tab");
  const [activeTab, setActiveTab] = useState(defaultTab || "1");

  return (
    <>
      <title>Profile</title>
      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-4 lg:py-8">
        <EmployeeProfileLeftSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <div className="w-full h-fit">
          {activeTab === "1" ? (
            <EmployeePersonalDetails />
          ) : (
            <EmployeeCompanyDetails />
          )}
        </div>
      </div>
    </>
  );
};

export default withAuth(page);
