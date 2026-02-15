import Resumes from "@/app/(auth)/auth/onboarding/steps/Resumes";
import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import FileUploader from "@/app/components/form/FileUploader";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import routePaths from "@/app/config/routePaths";
import { IJob, IResume } from "@/app/types/types";
import { applyJobValidation } from "@/app/utils/validations";
import { addToast, Button, Checkbox, Textarea } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { uploadToS3 } from "@/app/utils/s3Upload";

type Props = {
  job: IJob | null;
};

const defaultValues = {
  jobId: "",
  resumeId: "",
  coverLetter: "",
  agreeConsent: false,
};

const ApplyJobForm = ({ job }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resumes, setResumes] = useState<IResume[]>([]);

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(applyJobValidation),
  });

  const { resumeId } = useWatch({ control });

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
      getResumes();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getResumes = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.GET_RESUMES);
      if (response?.data) {
        setResumes(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getResumes();
  }, []);

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      data.jobId = job?.id as string;
      await http.post(ENDPOINTS.APPLICATIONS.APPLY, data);
      addToast({
        color: "success",
        title: "Success",
        description: "Job applied successfully",
      });
      router.push(
        routePaths.jobs.applicationSent(job?.company?.name || "Anonymous"),
      );
      reset();
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) return <LoadingProgress />;

  return (
    <div className="w-full bg-white rounded-lg p-5">
      <h3 className="font-medium">Apply Job: {job?.title}</h3>

      <Resumes
        resumes={resumes}
        selected={resumeId}
        refetch={getResumes}
        onSelect={(id: string) => setValue("resumeId", id)}
      />
      <FileUploader accept="application/pdf" onChange={handleChangeFile} />
      {errors?.resumeId?.message && (
        <p className="text-red-500 text-sm mt-1">{errors?.resumeId?.message}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 mt-5">
        <Controller
          name="coverLetter"
          control={control}
          render={({ field }) => (
            <Textarea
              autoFocus
              {...field}
              minRows={8}
              label="Cover Letter"
              labelPlacement="outside"
              placeholder="Enter cover letter"
              isInvalid={!!errors?.coverLetter}
              errorMessage={errors?.coverLetter?.message}
            />
          )}
        />

        <Controller
          name="agreeConsent"
          control={control}
          render={({ field }) => (
            <Checkbox
              size="md"
              checked={field?.value}
              className="mb-4 items-start"
              isInvalid={!!errors?.agreeConsent}
              onChange={(ev) => field?.onChange(ev.target.checked)}
            >
              I consent to the processing of my personal data for the purpose of
              this application and agree to the company's terms and conditions.
            </Checkbox>
          )}
        />

        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            color="primary"
            isLoading={isSubmitting}
          >
            Apply
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ApplyJobForm;
