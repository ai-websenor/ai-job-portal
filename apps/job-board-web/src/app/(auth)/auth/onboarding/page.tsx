"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Tab, Tabs } from "@heroui/react";
import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import { onboardingValidation } from "@/app/utils/validations";
import PersonalInformation from "./steps/PersonalInformation";
import EducationDetails from "./steps/EducationDetails";
import Skills from "./steps/Skills";
import ExperienceDetails from "./steps/ExperienceDetails";
import JobPreferences from "./steps/JobPreferences";
import Certifications from "./steps/Certifications";
import LoadingProgress from "@/app/components/lib/LoadingProgress";

const tabs = [
  { key: "1", title: "Personal Information" },
  { key: "2", title: "Education Details" },
  { key: "3", title: "Skills" },
  { key: "4", title: "Work Experience" },
  { key: "5", title: "Job Preferences" },
  { key: "6", title: "Certifications" },
];

const OnboardingContent = () => {
  const params = useSearchParams();
  const defaultStep = params.get("step");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultStep || "1");

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(onboardingValidation[activeTab]),
  });

  const getProfileData = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
      const data = response?.data;
      if (data) {
        reset({
          ...data,
          summary: data?.professionalSummary,
        });
      }
    } catch (error) {
      console.error("Prefill Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfileData();
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key.toString())}
        color="primary"
        variant="underlined"
        className="mb-5"
        size="lg"
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
            <PersonalInformation
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              setActiveTab={setActiveTab}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "2" && (
            <EducationDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "3" && (
            <Skills
              errors={errors}
              control={control}
              setValue={setValue}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "4" && (
            <ExperienceDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "5" && (
            <JobPreferences
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === "6" && (
            <Certifications
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
            />
          )}
        </>
      )}
    </div>
  );
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingProgress />}>
      <OnboardingContent />
    </Suspense>
  );
}
