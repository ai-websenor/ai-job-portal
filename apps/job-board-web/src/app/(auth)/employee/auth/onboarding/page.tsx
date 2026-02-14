"use client";

import { employeeOnboardingValidation } from "@/app/utils/validations";
import { Tab, Tabs } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import BasicDetails from "./steps/BasicDetails";
import CompanyDetails from "./steps/CompanyDetails";
import LoadingProgress from "@/app/components/lib/LoadingProgress";

const page = () => {
  const params = useSearchParams();
  const defaultStep = params.get("step");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultStep || "1");

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(employeeOnboardingValidation[activeTab]),
  });

  return (
    <div className="h-full w-full flex flex-col">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key.toString())}
        color="primary"
        variant="underlined"
        className="mb-5"
      >
        {tabs.map((tab) => (
          <Tab key={tab.key} title={tab.title} className="font-medium" />
        ))}
      </Tabs>

      {loading ? (
        <LoadingProgress />
      ) : (
        <>
          {activeTab === "1" && (
            <BasicDetails
              reset={reset}
              errors={errors}
              control={control}
              isSubmitting={isSubmitting}
              setActiveTab={setActiveTab}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "2" && (
            <CompanyDetails
              reset={reset}
              errors={errors}
              control={control}
              isSubmitting={isSubmitting}
              setActiveTab={setActiveTab}
              handleSubmit={handleSubmit}
            />
          )}
        </>
      )}
    </div>
  );
};

export default page;

const tabs = [
  { key: "1", title: "Basic Details" },
  { key: "2", title: "Company Details" },
];
