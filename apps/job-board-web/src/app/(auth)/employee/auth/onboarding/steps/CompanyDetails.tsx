import FileUploader from "@/app/components/form/FileUploader";
import routePaths from "@/app/config/routePaths";
import { OnboardingStepProps } from "@/app/types/types";
import { Button, Input } from "@heroui/react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";

const CompanyDetails = ({
  errors,
  control,
  setActiveTab,
  handleSubmit,
  reset,
  isSubmitting,
}: OnboardingStepProps) => {
  const router = useRouter();
  const onFileChange = (file: File) => {
    console.log(file);
  };

  const onSubmit = async (data: any) => {
    reset?.();
    router.push(routePaths.employee.dashboard);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field, index) => {
        const fieldError = errors[field.name];
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            render={({ field: inputProps }) => {
              return (
                <Input
                  {...inputProps}
                  readOnly={field.isDisabled}
                  labelPlacement="outside"
                  size="lg"
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  label={field.label}
                  isInvalid={!!fieldError}
                  className="mb-4"
                  errorMessage={fieldError?.message}
                />
              );
            }}
          />
        );
      })}

      <div>
        <p className="mb-2">GST Document</p>
        <FileUploader accept="all" onChange={onFileChange} />
      </div>

      <div className="mt-2 flex justify-end">
        <Button
          endContent={<IoMdArrowForward size={18} />}
          color="primary"
          type="submit"
          isLoading={isSubmitting}
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export default CompanyDetails;

export const fields = [
  {
    name: "companyName",
    type: "text",
    label: "Company Name",
    placeholder: "Example company name",
    isDisabled: false,
  },
  {
    name: "pan",
    type: "text",
    label: "Pan Number",
    placeholder: "Example pan number",
    isDisabled: false,
  },
  {
    name: "gst",
    type: "text",
    label: "GST Number",
    placeholder: "Example gst number",
    isDisabled: false,
  },
];
