'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { ProfileEditProps } from '@/app/types/types';
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
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';
import WorkExperienceCard from '../cards/WorkExperienceCard';
import { employmentTypes } from '@/app/config/data';
import { getLocalTimeZone, today } from '@internationalized/date';

const ExperienceDetails = ({
  control,
  errors,
  handleSubmit,
  isSubmitting,
  refetch,
}: ProfileEditProps) => {
  const [showForm, setShowForm] = useState(false);
  const { workExperiences } = useWatch({ control });

  const toggleForm = () => setShowForm((prev) => !prev);

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)));

    try {
      await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, payload);
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Experience added successfully',
      });
      toggleForm();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Experience Details</h1>
      {!showForm ? (
        <div className="grid gap-5">
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5 sm:grid-cols-2">
            {fields?.map((field) => {
              const fieldError = errors[field.name];

              return (
                <Controller
                  key={field.name}
                  control={control}
                  name={field.name}
                  render={({ field: inputProps }) => {
                    if (field?.type === 'select') {
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
                          isSelected={inputProps.value}
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
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button color="primary" size="md" type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExperienceDetails;

const fields = [
  {
    name: 'title',
    type: 'text',
    label: 'Job Title',
    placeholder: 'Enter job title',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'designation',
    type: 'text',
    label: 'Designation',
    placeholder: 'Ex: Lead Developer',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'companyName',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Ex: Google',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'employmentType',
    type: 'select',
    label: 'Employment Type',
    placeholder: 'Ex: Full-time',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'location',
    type: 'text',
    label: 'Location',
    placeholder: 'Ex: San Francisco, CA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'skillsUsed',
    type: 'text',
    label: 'Skills Used',
    placeholder: 'Skills used in this role',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Describe your role & achievements',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'achievements',
    type: 'textarea',
    label: 'Achievements',
    placeholder: 'Key projects or achievements',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'isCurrent',
    type: 'checkbox',
    label: "I'm currently working here",
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
