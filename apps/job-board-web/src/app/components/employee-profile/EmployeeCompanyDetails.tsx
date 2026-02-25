'use client';

import { addToast, Button, Form, Input } from '@heroui/react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { employeeProfileSchema } from '@/app/utils/validations';
import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '../lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import EmployeeCompanyImages from './EmployeeCompanyImages';

const EmployeeCompanyDetails = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(employeeProfileSchema['2']),
  });

  const getCompanyDetails = async () => {
    setLoading(true);
    try {
      const res = await http.get(ENDPOINTS.EMPLOYER.COMPANY_PROFILE);
      const data = res?.data;
      if (data) {
        reset({
          name: data?.name,
          panNumber: data?.panNumber,
          gstNumber: data?.gstNumber,
          cinNumber: data?.cinNumber,
          logoUrl: data?.logoUrl,
          bannerUrl: data?.bannerUrl,
          gstDocumentUrl: data?.gstDocumentUrl,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCompanyDetails();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const res = await http.put(ENDPOINTS.EMPLOYER.COMPANY_PROFILE, data);
      if (res?.data) {
        setUser({
          ...user,
          company: res?.data,
        } as any);
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Company details updated successfully',
        });
        getCompanyDetails();
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <LoadingProgress />;
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="w-full grid gap-5">
      <div className="bg-white p-5 sm:p-10 rounded-lg w-full">
        <h3 className="font-medium text-xl mb-5">Basic Details</h3>
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-10 w-full">
          {fields?.map((field, index) => {
            const fieldError: any = errors?.[field?.name as keyof typeof errors];

            return (
              <Controller
                key={index}
                control={control}
                name={field.name as any}
                render={({ field: inputProps }) => {
                  return (
                    <Input
                      {...inputProps}
                      type={field.type}
                      autoFocus={index === 0}
                      label={field.label}
                      placeholder={field.placeholder}
                      labelPlacement="outside"
                      size="lg"
                      isInvalid={!!fieldError}
                      errorMessage={fieldError?.message}
                    />
                  );
                }}
              />
            );
          })}
        </div>
      </div>

      <EmployeeCompanyImages control={control} setValue={setValue} refetch={getCompanyDetails} />

      <div className=" flex gap-3 justify-end w-full">
        <Button color="primary" type="submit" isLoading={isSubmitting}>
          Save
        </Button>
      </div>
    </Form>
  );
};

export default EmployeeCompanyDetails;

export const fields = [
  {
    name: 'name',
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
