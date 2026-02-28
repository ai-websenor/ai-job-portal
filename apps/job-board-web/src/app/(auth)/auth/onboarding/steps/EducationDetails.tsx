'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import EducationCard from '@/app/components/cards/EducationCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { OnboardingStepProps } from '@/app/types/types';
import {
  addToast,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd } from 'react-icons/md';

const EducationDetails = ({
  control,
  errors,
  refetch,
  handleSubmit,
  handleNext,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);

  const { educationRecords } = useWatch({ control });

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
      const response = await http.get(ENDPOINTS.MASTER_DATA.FIELDS_OF_STUDY(degreeId));
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

    const payload = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)));

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, {
        ...payload,
        startDate: dayjs(data?.startDate || dayjs()).format('YYYY-MM-DD'),
        endDate: dayjs(data?.endDate || dayjs()).format('YYYY-MM-DD'),
      });
      refetch?.();
      handleNext?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Education details added successfully',
      });
      setShowForm(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return !showForm && educationRecords?.length > 0 ? (
    <div className="flex flex-col gap-2">
      {educationRecords?.map((record: any) => (
        <EducationCard key={record.id} education={record} refetch={refetch} />
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
            key={field?.name}
            control={control}
            name={field.name as any}
            render={({ field: inputProps }) => {
              if (field?.type === 'select') {
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
                    {optionsMap?.[field?.name]?.map((option: any) => (
                      <SelectItem
                        key={option?.label}
                        onPress={() => {
                          if (field?.name === 'degree') {
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

              if (field?.type === 'date') {
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

              if (field?.type === 'textarea') {
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

              if (field?.type === 'checkbox') {
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

      <div className="mt-2 flex justify-between">
        {showForm ? (
          <Button color="default" onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        ) : (
          <div />
        )}

        <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
};

export default EducationDetails;

const fields = [
  {
    name: 'degree',
    type: 'select',
    label: 'Degree',
    placeholder: 'Example degree',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'institution',
    type: 'text',
    label: 'Institution Name',
    placeholder: 'Enter institution name',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'fieldOfStudy',
    type: 'select',
    label: 'Field of Study',
    placeholder: 'Enter field of study',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: 'Enter start date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: 'Enter end date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'grade',
    type: 'text',
    label: 'Grade',
    placeholder: 'e.g. A, 3.8 GPA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'honors',
    type: 'text',
    label: 'Honors',
    placeholder: "e.g. Honor Roll, Dean's List",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Additional details about your education',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'currentlyStudying',
    type: 'checkbox',
    label: 'Currently Studying',
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
