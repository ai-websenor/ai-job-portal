'use client';

import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  DatePicker,
  Form,
  Input,
  Textarea,
} from '@heroui/react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { employeeProfileSchema } from '@/app/utils/validations';
import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '../lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import EmployeeCompanyImages from './EmployeeCompanyImages';
import { companyTypeOptions, filterIndustryOptions } from '@/app/config/data';
import CommonUtils from '@/app/utils/commonUtils';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';

const EmployeeCompanyDetails = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [showBasicForm, setShowBasicForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);

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

  const basicFields = fields.filter((f) => f.section === 'basic');
  const additionalFields = fields.filter((f) => f.section === 'additional');

  const toggleForm = (type: 'basic' | 'additional') => {
    if (type === 'basic') {
      setShowBasicForm(!showBasicForm);
    } else {
      setShowAdditionalForm(!showAdditionalForm);
    }
  };

  const renderValue = (fieldName: string) => {
    const val = watchedValues?.[fieldName];
    if (!val) return 'Not provided';

    if (fieldName === 'companyType') {
      return companyTypeOptions.find((c: any) => String(c.value) === String(val))?.label || val;
    } else if (fieldName === 'yearEstablished') {
      return dayjs(val).format('YYYY');
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

  const onSubmit = async (data: any, section: 'basic' | 'additional') => {
    const sectionFieldNames = fields.filter((f) => f.section === section).map((f) => f.name);

    const payload = sectionFieldNames.reduce((acc: any, fieldName) => {
      if (fieldName in data) {
        const value = data[fieldName];
        if (value !== undefined && value !== null && value !== '') {
          acc[fieldName] = value;
        }
      }
      return acc;
    }, {});

    if (section === 'basic' && payload.yearEstablished) {
      payload.yearEstablished = dayjs(payload.yearEstablished).format('YYYY');
    } else if (section == 'additional' && payload.employeeCount) {
      payload.employeeCount = Number(payload.employeeCount);
    }

    try {
      const res = await http.put(ENDPOINTS.EMPLOYER.COMPANY_PROFILE, payload);

      if (res?.data) {
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Company details updated successfully',
        });
        setShowBasicForm(false);
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
          {!showBasicForm && (
            <Button color="primary" size="sm" onPress={() => toggleForm('basic')}>
              Edit
            </Button>
          )}
        </div>

        {!showBasicForm ? (
          <div className="grid sm:grid-cols-2 gap-6 w-full">
            {basicFields.map((field) => (
              <div key={field.name} className="flex flex-col">
                <span className="text-tiny uppercase font-semibold text-foreground-500">
                  {field.label}
                </span>
                <span className="text-medium">{renderValue(field?.name)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Form onSubmit={handleSubmit((d) => onSubmit(d, 'basic'))} className="w-full">
            <div className="grid sm:grid-cols-2 gap-5 w-full">
              {basicFields?.map((field, index) => {
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
                          industry: filterIndustryOptions.map((v) => ({
                            key: v,
                            label: CommonUtils.keyIntoTitle(v),
                          })),
                        };

                        return (
                          <Autocomplete
                            {...inputProps}
                            label={field.label}
                            placeholder={field.placeholder}
                            labelPlacement="outside"
                            size="lg"
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

                      if (field.type === 'date') {
                        return (
                          <DatePicker
                            {...inputProps}
                            value={inputProps.value ?? null}
                            label={field.label}
                            size="lg"
                            labelPlacement="outside"
                            showMonthAndYearPickers
                            isInvalid={!!fieldError}
                            errorMessage={fieldError?.message}
                            maxValue={today(getLocalTimeZone())}
                          />
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

            <div className="mt-3 flex gap-3 justify-end w-full">
              <Button size="md" onPress={() => toggleForm('basic')}>
                Cancel
              </Button>
              <Button color="primary" size="md" type="submit" isLoading={isSubmitting}>
                Save
              </Button>
            </div>
          </Form>
        )}
      </div>

      <div className="bg-white p-5 sm:p-10 rounded-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-medium text-xl">Additional Information</h3>
          {!showAdditionalForm && (
            <Button color="primary" size="sm" onPress={() => toggleForm('additional')}>
              Edit
            </Button>
          )}
        </div>

        {!showAdditionalForm ? (
          <div className="grid sm:grid-cols-2 gap-6 w-full">
            {additionalFields.map((field) => (
              <div key={field.name} className="flex flex-col">
                <span className="text-tiny uppercase font-semibold text-foreground-500">
                  {field.label}
                </span>
                <span className="text-medium">{renderValue(field?.name)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Form onSubmit={handleSubmit((d) => onSubmit(d, 'additional'))} className="w-full">
            <div className="grid sm:grid-cols-2 gap-5 w-full">
              {additionalFields?.map((field, index) => {
                const fieldError: any = errors?.[field?.name as keyof typeof errors];

                return (
                  <Controller
                    key={index}
                    control={control}
                    name={field.name as any}
                    render={({ field: inputProps }) => {
                      if (field.type === 'textarea') {
                        return (
                          <Textarea
                            {...inputProps}
                            label={field.label}
                            placeholder={field.placeholder}
                            labelPlacement="outside"
                            size="lg"
                            minRows={6}
                            isInvalid={!!fieldError}
                            errorMessage={fieldError?.message}
                          />
                        );
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

            <div className="mt-3 flex gap-3 justify-end w-full">
              <Button size="md" onPress={() => toggleForm('additional')}>
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

const fields = [
  {
    name: 'name',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Example company name',
    section: 'basic',
  },
  {
    name: 'companyType',
    type: 'select',
    label: 'Company Type',
    placeholder: 'Example company type',
    section: 'basic',
  },
  {
    name: 'industry',
    type: 'select',
    label: 'Industry',
    placeholder: 'Select Industry',
    section: 'basic',
  },
  {
    name: 'yearEstablished',
    type: 'date',
    label: 'Year Established',
    placeholder: 'Select Year Established',
    section: 'basic',
  },
  {
    name: 'panNumber',
    type: 'text',
    label: 'Pan Number',
    placeholder: 'Example pan number',
    section: 'basic',
  },
  {
    name: 'gstNumber',
    type: 'text',
    label: 'GST Number',
    placeholder: 'Example gst number',
    section: 'basic',
  },
  {
    name: 'cinNumber',
    type: 'text',
    label: 'Company Identification Number',
    placeholder: 'Example cin number',
    section: 'basic',
  },

  {
    name: 'mission',
    type: 'text',
    label: 'Mission',
    placeholder: 'To simplify hiring for every company in India.',
    section: 'additional',
  },
  {
    name: 'culture',
    type: 'text',
    label: 'Culture',
    placeholder: 'We value transparency, ownership and continuous learning.',
    section: 'additional',
  },
  {
    name: 'tagline',
    type: 'text',
    label: 'Tagline',
    placeholder: 'Hire smarter, faster',
    section: 'additional',
  },
  {
    name: 'headquarters',
    type: 'text',
    label: 'Headquarters',
    placeholder: 'New Delhi, India',
    section: 'additional',
  },
  {
    name: 'employeeCount',
    type: 'number',
    label: 'Employee Count',
    placeholder: '100',
    section: 'additional',
  },
  {
    name: 'website',
    type: 'text',
    label: 'Website',
    placeholder: 'https://example.com',
    section: 'additional',
  },
  {
    name: 'linkedinUrl',
    type: 'text',
    label: 'LinkedIn URL',
    placeholder: 'https://linkedin.com/company/example',
    section: 'additional',
  },
  {
    name: 'twitterUrl',
    type: 'text',
    label: 'Twitter URL',
    placeholder: 'https://twitter.com/company',
    section: 'additional',
  },
  {
    name: 'facebookUrl',
    type: 'text',
    label: 'Facebook URL',
    placeholder: 'https://facebook.com/company',
    section: 'additional',
  },
  {
    name: 'instagramUrl',
    type: 'text',
    label: 'Instagram URL',
    placeholder: 'https://instagram.com/company',
    section: 'additional',
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'We build innovative SaaS products for the hiring industry.',
    section: 'additional',
  },
  {
    name: 'benifits',
    type: 'textarea',
    label: 'Benifits',
    placeholder: 'Health insurance, flexible hours, remote work, learning budget',
    section: 'additional',
  },
];
