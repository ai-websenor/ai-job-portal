"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import { ITemplate, ProfileEditProps } from "@/app/types/types";
import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import FileUploader from "../form/FileUploader";
import Resumes from "@/app/(auth)/auth/onboarding/steps/Resumes";
import ResumeTemplateCard from "../cards/ResumeTemplateCard";
import LoadingProgress from "../lib/LoadingProgress";
import { uploadToS3 } from "@/app/utils/s3Upload";

const ResumeSection = ({ refetch, control }: ProfileEditProps) => {
  const { resumes } = useWatch({ control });
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ITemplate[]>([]);

  const getTemplates = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.TEMPLATES.LIST);
      if (response?.data) {
        setTemplates(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTemplates();
  }, []);

  const handleChangeFile = async (file: File) => {
    if (!file?.name) return;
    try {
      setLoading(true);
      const { key, fileName, contentType } = await uploadToS3({
        file,
        category: "resume",
      });
      await http.post(ENDPOINTS.CANDIDATE.CONFIRM_RESUME_UPLOAD, {
        key,
        fileName,
        contentType,
      });
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Resumes</h1>
      </div>

      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="bg-default-10 p-4 rounded-xl border">
            <h3 className="text-sm font-semibold text-default-500 mb-4 uppercase tracking-wider">
              Upload New Resume
            </h3>
            <FileUploader
              accept="application/pdf"
              onChange={handleChangeFile}
            />
          </div>

          <Resumes
            isDownloadable
            resumes={resumes}
            refetch={refetch}
            isDeletable={resumes?.length > 1}
          />

          <div className="mt-2">
            <div className="flex flex-col gap-1 mb-6">
              <h3 className="font-bold text-xl">Resume Templates</h3>
              <p className="text-default-500 text-sm">
                Choose from our premium collection of professional templates
              </p>
            </div>

            {templates?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                {templates?.map((template) => (
                  <ResumeTemplateCard key={template?.id} {...template} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 bg-default-50 rounded-xl border border-dashed border-default-200">
                <p className="text-default-500">
                  No templates available at the moment
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeSection;
