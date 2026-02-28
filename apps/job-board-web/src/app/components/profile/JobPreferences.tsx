'use cleint';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import {
  currencyData,
  filterIndustryOptions,
  jobSearchStatusOptions,
  noticePeriodOptions,
  workShiftOptions,
} from '@/app/config/data';
import { ProfileEditProps } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { addToast, Button, Checkbox, Input, Select, SelectItem } from '@heroui/react';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';

const JobPreferences = ({
  control,
  errors,
  handleSubmit,
  refetch,
  isSubmitting,
}: ProfileEditProps) => {
  const [showForm, setShowForm] = useState(false);

  const watchedValues = useWatch({ control });

  const toggleForm = () => setShowForm((prev) => !prev);

  const renderValue = (fieldName: string) => {
    const val = watchedValues?.jobPreferences?.[fieldName?.split?.('.')?.[1]];
    if (!val) return 'Not provided';

    return val;
  };

  const onSubmit = async (data: any) => {
    try {
      await http.put(ENDPOINTS.CANDIDATE.UPDATE_PREFERENCES, {
        ...data?.jobPreferences,
        preferredLocations: data?.jobPreferences?.preferredLocations ?? '',
      });
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Job preferences added successfully',
      });
      refetch();
      toggleForm();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Preferences</h1>
        {!showForm && (
          <Button color="primary" size="sm" variant="flat" onPress={toggleForm}>
            Edit
          </Button>
        )}
      </div>
      {!showForm ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col">
              <span className="text-tiny uppercase font-semibold text-foreground-500">
                {field.label}
              </span>
              <span className="text-medium capitalize">{renderValue(field?.name)}</span>
            </div>
          ))}
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
                        'jobPreferences.preferredIndustries': filterIndustryOptions.map((v) => ({
                          key: v,
                          label: CommonUtils.keyIntoTitle(v),
                        })),
                        'jobPreferences.salaryCurrency': currencyData.map((v) => ({
                          key: v,
                          label: v,
                        })),
                        'jobPreferences.noticePeriodDays': noticePeriodOptions,
                        'jobPreferences.jobSearchStatus': jobSearchStatusOptions,
                        'jobPreferences.workShift': workShiftOptions,
                      };

                      return (
                        <Select
                          {...inputProps}
                          label={field.label}
                          placeholder={field.placeholder}
                          labelPlacement="outside"
                          size="lg"
                          className="mb-4"
                          selectedKeys={new Set([inputProps.value])}
                          isInvalid={!!fieldError}
                          errorMessage={fieldError?.message}
                        >
                          {optionsMap[field.name]?.map((option: any) => (
                            <SelectItem key={option?.key}>{option?.label}</SelectItem>
                          ))}
                        </Select>
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

export default JobPreferences;

const fields = [
  {
    name: 'jobPreferences.jobTypes',
    type: 'chip',
    label: 'Job Type',
    placeholder: 'Enter job title',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.preferredIndustries',
    type: 'select',
    label: 'Industry Preference',
    placeholder: 'Select Industry',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.expectedSalary',
    type: 'number',
    label: 'Expected Salary',
    placeholder: '0',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.salaryCurrency',
    type: 'select',
    label: 'Salary Currency',
    placeholder: 'Select Salary Currency',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.noticePeriodDays',
    type: 'select',
    label: 'Notice Period',
    placeholder: 'Select Notice Period',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.jobSearchStatus',
    type: 'select',
    label: 'Job Search Status',
    placeholder: 'Select Job Search Status',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.workShift',
    type: 'select',
    label: 'Work Shift',
    placeholder: 'Select Work Shift',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'jobPreferences.willingToRelocate',
    type: 'checkbox',
    label: 'Open to Relocation?',
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
