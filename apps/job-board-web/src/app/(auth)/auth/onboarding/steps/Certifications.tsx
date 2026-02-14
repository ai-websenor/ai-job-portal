"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import routePaths from "@/app/config/routePaths";
import { OnboardingStepProps } from "@/app/types/types";
import { addToast, Button, DatePicker, Input } from "@heroui/react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";

const Certifications = ({
  control,
  errors,
  handleSubmit,
}: OnboardingStepProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_CERTIFICATION, {
        ...payload,
        issueDate: payload?.issueDate
          ? dayjs(payload?.issueDate as any).format("YYYY-MM-DD")
          : null,
        expiryDate: payload?.expiryDate
          ? dayjs(payload?.expiryDate as any).format("YYYY-MM-DD")
          : null,
      });
      addToast({
        color: "success",
        title: "Success",
        description: "Certification added successfully",
      });
      router.push(routePaths.videoResume);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field) => {
        const fieldError = errors[field.name];

        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: inputProps }) => {
              if (field?.type === "date") {
                <DatePicker
                  {...inputProps}
                  label={field.label}
                  size="md"
                  className="mb-4"
                  isInvalid={!!fieldError}
                  errorMessage={fieldError?.message}
                />;
              }

              return (
                <Input
                  {...inputProps}
                  type={field.type}
                  label={field.label}
                  placeholder={field.placeholder}
                  labelPlacement="outside"
                  size="lg"
                  className="mb-4"
                  isInvalid={!!fieldError}
                  errorMessage={fieldError?.message}
                />
              );
            }}
          />
        );
      })}

      <div className="mt-2 flex justify-end">
        <Button
          endContent={<IoMdArrowForward size={18} />}
          color="primary"
          type="submit"
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export default Certifications;

const fields = [
  {
    name: "name",
    type: "text",
    label: "Certificate Name",
    placeholder: "e.g. Amazon Solutions Architect",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "issuingOrganization",
    type: "text",
    label: "Issuing Organization",
    placeholder: "e.g. Amazon Web Services",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "issueDate",
    type: "date",
    label: "Issue Date",
    placeholder: "e.g. 2022-01-01",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "expiryDate",
    type: "date",
    label: "Expiry Date",
    placeholder: "e.g. 2022-01-01",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "credentialId",
    type: "text",
    label: "Credential ID",
    placeholder: "e.g. AWS-123",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "credentialUrl",
    type: "text",
    label: "Credential URL",
    placeholder: "e.g. https://www.amazon.com",
    isDisabled: false,
    isRequired: false,
  },
];
