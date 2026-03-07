'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { OnboardingStepProps } from '@/app/types/types';
import { addToast, Button, Input } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';

const CompanyDetails = ({
  errors,
  reset,
  control,
  handleSubmit,
  isSubmitting,
}: OnboardingStepProps) => {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();
  const sessionToken = params.get('sessionToken') as string;

  const onSubmit = async (data: any) => {
    const allowedKeys = fields.map((field) => field.name);

    const payload = Object.keys(data)
      .filter((key) => allowedKeys.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    try {
      payload.sessionToken = sessionToken;

      const response = await http.post(ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.COMPANY_DETAILS, payload);

      const result = response?.data;

      if (result) {
        reset?.();

        setLocalStorage('token', result?.accessToken);
        setLocalStorage('refreshToken', result?.refreshToken);

        addToast({
          color: 'success',
          title: 'Success',
          description: 'Registration successfully',
        });

        router.push(routePaths.employee.dashboard);
        setUser({
          ...result?.user,
          company: result?.company,
        });
      }
    } catch (error) {
      console.log(error);
    }
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
    name: 'companyName',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Example company name',
    isDisabled: false,
  },
  {
    name: 'panNumber',
    type: 'text',
    label: 'Pan Number',
    placeholder: 'Example pan number',
    isDisabled: false,
  },
  {
    name: 'gstNumber',
    type: 'text',
    label: 'GST Number',
    placeholder: 'Example gst number',
    isDisabled: false,
  },
  {
    name: 'cinNumber',
    type: 'text',
    label: 'Company Identification Number',
    placeholder: 'Example cin number',
    isDisabled: false,
  },
];
