'use client';

import { addToast, Autocomplete, AutocompleteItem, Button, Form, Input } from '@heroui/react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { employeeProfileSchema } from '@/app/utils/validations';
import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '../lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import EmployeeCompanyImages from './EmployeeCompanyImages';
import { companyTypeOptions } from '@/app/config/data';

const EmployeeCompanyDetails = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(employeeProfileSchema['2']),
  });

  const watchedValues = useWatch({ control });

  const toggleForm = () => setShowForm(!showForm);

  const renderValue = (fieldName: string) => {
    const val = watchedValues?.[fieldName];
    if (!val) return 'Not provided';

    if (fieldName === 'companyType') {
      return companyTypeOptions.find((c: any) => String(c.value) === String(val))?.label || val;
    }

    return val;
  };

  const getCompanyDetails = async () => {
    setLoading(true);
    try {
      const res = await http.get(ENDPOINTS.EMPLOYER.COMPANY_PROFILE);
      const data = res?.data;
      if (data) {
        reset({
          id: data?.id,
          name: data?.name,
          panNumber: data?.panNumber,
          gstNumber: data?.gstNumber,
          cinNumber: data?.cinNumber,
          logoUrl: data?.logoUrl,
          bannerUrl: data?.bannerUrl,
          gstDocumentUrl: data?.gstDocumentUrl,
          companyType: data?.companyType,
        });
        setUser({
          ...user,
          company: data,
        } as any);
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
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Company details updated successfully',
        });
        setShowForm(false);
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
    <div className="w-full grid gap-5">
      <div className="bg-white p-5 sm:p-10 rounded-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-medium text-xl">Basic Details</h3>
          {!showForm && (
            <Button color="primary" size="sm" variant="flat" onPress={toggleForm}>
              Edit
            </Button>
          )}
        </div>

        {!showForm ? (
          <div className="grid sm:grid-cols-2 gap-6 w-full">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col">
                <span className="text-tiny uppercase font-semibold text-foreground-500">
                  {field.label}
                </span>
                <span className="text-medium">{renderValue(field?.name)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <div className="grid sm:grid-cols-2 gap-5 sm:gap-10 w-full">
              {fields?.map((field, index) => {
                const fieldError: any = errors?.[field?.name as keyof typeof errors];

                return (
                  <Controller
                    key={index}
                    control={control}
                    name={field.name as any}
                    render={({ field: inputProps }) => {
                      if (field.type === 'select') {
                        const optionsMap: Record<string, any[]> = {
                          companyType: companyTypeOptions,
                        };

                        return (
                          <Autocomplete
                            {...inputProps}
                            label={field.label}
                            placeholder={field.placeholder}
                            labelPlacement="outside"
                            size="lg"
                            className="mb-4"
                            isInvalid={!!fieldError}
                            errorMessage={fieldError?.message}
                            items={optionsMap[field.name]}
                            defaultItems={optionsMap[field.name]}
                            selectedKey={String(inputProps.value || '')}
                            onSelectionChange={(key) => {
                              if (key) {
                                inputProps.onChange(key);
                              }
                            }}
                          >
                            {(item: any) => (
                              <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>
                            )}
                          </Autocomplete>
                        );
                      }

                      if (
                        field.name === 'gstNumber' ||
                        field.name === 'panNumber' ||
                        field.name === 'cinNumber'
                      ) {
                        return null as any;
                      }

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
            <div className="mt-10 flex gap-3 justify-end w-full">
              <Button size="md" onPress={toggleForm}>
                Cancel
              </Button>
              <Button color="primary" size="md" type="submit" isLoading={isSubmitting}>
                Save
              </Button>
            </div>
          </Form>
        )}
      </div>

      <EmployeeCompanyImages control={control} setValue={setValue} refetch={getCompanyDetails} />
    </div>
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
    name: 'companyType',
    type: 'select',
    label: 'Company Type',
    placeholder: 'Example company type',
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
