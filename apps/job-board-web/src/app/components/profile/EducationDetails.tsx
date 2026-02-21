"use client";

import { ProfileEditProps } from "@/app/types/types";
import { Controller, useWatch } from "react-hook-form";
import EducationCard from "../cards/EducationCard";
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
import { useEffect, useState } from "react";
import { MdAdd } from "react-icons/md";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import dayjs from "dayjs";
import { degreeOptions } from "@/app/config/data";
import LoadingProgress from "../lib/LoadingProgress";
import { getLocalTimeZone, today } from "@internationalized/date";

const EducationDetails = ({
  errors,
  control,
  refetch,
  isSubmitting,
  handleSubmit,
}: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);

  const { educationRecords } = useWatch({ control });

  const toggleForm = () => setShowForm(!showForm);

  const getDegrees = async () => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.DEGRESS);
      if (response?.data?.length > 0) {
        setDegrees(
          response?.data?.map((degree: any) => ({
            id: degree?.id,
            label: degree?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldsOfStudies = async (degreeId: string) => {
    try {
      const response = await http.get(
        ENDPOINTS.MASTER_DATA.FIELDS_OF_STUDY(degreeId),
      );
      if (response?.data?.length > 0) {
        setFieldsOfStudies(
          response?.data?.map((study: any) => ({
            id: study?.id,
            label: study?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getDegrees();
  }, []);

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, {
        ...payload,
        startDate: dayjs(data?.startDate || dayjs()).format("YYYY-MM-DD"),
        endDate: dayjs(data?.endDate || dayjs()).format("YYYY-MM-DD"),
      });
      refetch?.();
      addToast({
        color: "success",
        title: "Success",
        description: "Education details added successfully",
      });
      toggleForm();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Education Details</h1>
      {loading ? (
        <LoadingProgress />
      ) : !showForm ? (
        <div className="grid gap-5">
          {educationRecords?.map((record: any) => (
            <EducationCard
              key={record.id}
              id={record.id}
              refetch={refetch}
              degree={record.degree}
              startDate={record.startDate}
              endDate={record.endDate}
            />
          ))}

          <Button
            size="md"
            fullWidth
            color="default"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={toggleForm}
          >
            Add more
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid sm:grid-cols-2 gap-5">
            {fields?.map((field) => {
              const fieldError = errors[field.name];

              return (
                <Controller
                  key={field?.name}
                  control={control}
                  name={field.name as any}
                  render={({ field: inputProps }) => {
                    if (field?.type === "select") {
                      const optionsMap: Record<string, any[]> = {
                        degree: degrees,
                        fieldOfStudy: fieldsOfStudies,
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
                            <SelectItem
                              key={option?.label}
                              onPress={() => {
                                if (field?.name === "degree") {
                                  getFieldsOfStudies(option.id);
                                }
                              }}
                            >
                              {option?.label}
                            </SelectItem>
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
                          maxValue={today(getLocalTimeZone())}
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
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button
              color="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
            >
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EducationDetails;

const fields = [
  {
    name: "degree",
    type: "select",
    label: "Degree",
    placeholder: "Example degree",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "institution",
    type: "text",
    label: "Institution Name",
    placeholder: "Enter institution name",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "fieldOfStudy",
    type: "select",
    label: "Field of Study",
    placeholder: "Enter field of study",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "grade",
    type: "text",
    label: "Grade",
    placeholder: "e.g. A, 3.8 GPA",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "startDate",
    type: "date",
    label: "Start Date",
    placeholder: "Enter start date",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "endDate",
    type: "date",
    label: "End Date",
    placeholder: "Enter end date",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "honors",
    type: "text",
    label: "Honors",
    placeholder: "e.g. Honor Roll, Dean's List",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "description",
    type: "textarea",
    label: "Description",
    placeholder: "Additional details about your education",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: "currentlyStudying",
    type: "checkbox",
    label: "Currently Studying",
    placeholder: "",
    isDisabled: false,
    isRequired: false,
  },
];
