"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import WorkExperienceCard from "@/app/components/cards/WorkExperienceCard";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import { employmentTypes } from "@/app/config/data";
import { OnboardingStepProps } from "@/app/types/types";
import {
  addToast,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";
import { MdAdd } from "react-icons/md";

const ExperienceDetails = ({
  control,
  errors,
  handleSubmit,
  refetch,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { workExperiences } = useWatch({ control });

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, {
        ...payload,
        startDate: data?.startDate
          ? dayjs(data?.startDate).format("YYYY-MM-DD")
          : "",
        endDate: data?.endDate ? dayjs(data?.endDate).format("YYYY-MM-DD") : "",
      });
      refetch?.();
      addToast({
        color: "success",
        title: "Success",
        description: "Experience added successfully",
      });
      setShowForm(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return !showForm && workExperiences?.length > 0 ? (
    <div className="flex flex-col gap-2">
      {workExperiences?.map((record: any) => (
        <WorkExperienceCard
          key={record.id}
          id={record.id}
          refetch={refetch}
          companyName={record.companyName}
          title={record.title}
          startDate={record.startDate}
          endDate={record.endDate}
          description={record.description}
        />
      ))}

      <Button
        size="md"
        fullWidth
        color="default"
        className="mt-3"
        startContent={<MdAdd />}
        onPress={() => setShowForm(true)}
      >
        Add more
      </Button>
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field) => {
        const fieldError = errors[field.name];

        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: inputProps }) => {
              if (field?.type === "select") {
                const optionsMap: Record<string, any[]> = {
                  employmentType: employmentTypes,
                };

                return (
                  <Select
                    {...inputProps}
                    label={field.label}
                    placeholder={field.placeholder}
                    labelPlacement="outside"
                    size="lg"
                    className="mb-4"
                    isInvalid={!!fieldError}
                    errorMessage={fieldError?.message}
                  >
                    {optionsMap[field.name]?.map((option: any) => (
                      <SelectItem key={option?.key}>{option?.label}</SelectItem>
                    ))}
                  </Select>
                );
              }

              if (field?.type === "date") {
                return (
                  <DatePicker
                    {...inputProps}
                    label={field.label}
                    size="md"
                    className="mb-4"
                    isInvalid={!!fieldError}
                    errorMessage={fieldError?.message}
                  />
                );
              }

              if (field?.type === "textarea") {
                return (
                  <Textarea
                    {...inputProps}
                    label={field.label}
                    placeholder={field.placeholder}
                    labelPlacement="outside"
                    size="lg"
                    minRows={6}
                    className="mb-4"
                    isInvalid={!!fieldError}
                    errorMessage={fieldError?.message}
                  />
                );
              }

              if (field?.type === "checkbox") {
                return (
                  <Checkbox
                    {...inputProps}
                    placeholder={field.placeholder}
                    size="md"
                    className="mb-4"
                    isInvalid={!!fieldError}
                  >
                    {field?.label}
                  </Checkbox>
                );
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

      <div className="mt-2 flex justify-between">
        {showForm ? (
          <Button color="default" onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        ) : (
          <div />
        )}

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

export default ExperienceDetails;

const fields = [
  {
    name: "title",
    type: "text",
    label: "Job Title",
    placeholder: "Enter job title",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "designation",
    type: "text",
    label: "Designation",
    placeholder: "Ex: Lead Developer",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "companyName",
    type: "text",
    label: "Company Name",
    placeholder: "Ex: Google",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "employmentType",
    type: "select",
    label: "Employment Type",
    placeholder: "Ex: Full-time",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "location",
    type: "text",
    label: "Location",
    placeholder: "Ex: San Francisco, CA",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "startDate",
    type: "date",
    label: "Start Date",
    placeholder: "",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "endDate",
    type: "date",
    label: "End Date",
    placeholder: "",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "isCurrent",
    type: "checkbox",
    label: "I'm currently working here",
    placeholder: "",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "description",
    type: "textarea",
    label: "Description",
    placeholder: "Describe your role & achievements",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "achievements",
    type: "textarea",
    label: "Achievements",
    placeholder: "Key projects or achievements",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "skillsUsed",
    type: "text",
    label: "Skills Used",
    placeholder: "Skills used in this role",
    isDisabled: false,
    isRequired: false,
  },
];
