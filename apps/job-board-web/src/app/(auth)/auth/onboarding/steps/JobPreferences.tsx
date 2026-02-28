'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import {
  currencyData,
  filterIndustryOptions,
  jobSearchStatusOptions,
  noticePeriodOptions,
  workShiftOptions,
} from '@/app/config/data';
import useUserStore from '@/app/store/useUserStore';
import { OnboardingStepProps } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { addToast, Button, Checkbox, Input, Select, SelectItem } from '@heroui/react';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';

const JobPreferences = ({
  control,
  errors,
  refetch,
  handleSubmit,
  setActiveTab,
}: OnboardingStepProps) => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      await http.put(ENDPOINTS.CANDIDATE.UPDATE_PREFERENCES, {
        ...data?.jobPreferences,
        preferredLocations: data?.jobPreferences?.preferredLocations ?? '',
      });
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Job preferences added successfully',
      });
      refetch?.();
      setUser({
        ...user,
        isOnboardingCompleted: true,
      } as any);
      setActiveTab?.('6');
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
                    checked={inputProps.value}
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

      <div className="mt-2 flex justify-end">
        <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
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
