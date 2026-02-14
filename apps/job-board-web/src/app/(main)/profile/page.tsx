"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import EducationDetails from "@/app/components/profile/EducationDetails";
import ExperienceDetails from "@/app/components/profile/ExperienceDetails";
import JobPreferences from "@/app/components/profile/JobPreferences";
import PersonalInformation from "@/app/components/profile/PersonalInformation";
import ProfileLeftSection from "@/app/components/profile/ProfileLeftSection";
import ResumeSection from "@/app/components/profile/ResumeSection";
import Skills from "@/app/components/profile/Skills";
import { profileEditValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

const page = () => {
  const params = useSearchParams();
  const defaultTab = params.get("tab");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || "1");

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileEditValidation[activeTab]),
  });

  const getProfile = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
      const data = response?.data;
      if (data) {
        reset(data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  return (
    <>
      <title>Profile</title>
      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-4 lg:py-8">
        <ProfileLeftSection activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="bg-white p-5 sm:p-10 rounded-lg w-full h-fit">
          {loading ? (
            <LoadingProgress />
          ) : (
            <>
              {activeTab === "1" && (
                <PersonalInformation
                  errors={errors}
                  control={control}
                  setValue={setValue}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}

              {activeTab === "2" && (
                <EducationDetails
                  errors={errors}
                  control={control}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}

              {activeTab === "3" && (
                <Skills
                  errors={errors}
                  control={control}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}

              {activeTab === "4" && (
                <ExperienceDetails
                  errors={errors}
                  control={control}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}

              {activeTab === "5" && (
                <ResumeSection
                  errors={errors}
                  control={control}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}

              {activeTab === "6" && (
                <JobPreferences
                  errors={errors}
                  control={control}
                  refetch={getProfile}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default page;
