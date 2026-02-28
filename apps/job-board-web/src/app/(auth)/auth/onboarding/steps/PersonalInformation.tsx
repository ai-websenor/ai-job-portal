'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import FileUploader from '@/app/components/form/FileUploader';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import { OnboardingStepProps } from '@/app/types/types';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import Resumes from './Resumes';
import { addToast, Autocomplete, AutocompleteItem, Button, Input, Textarea } from '@heroui/react';
import { IoMdArrowForward } from 'react-icons/io';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import useLocalStorage from '@/app/hooks/useLocalStorage';

const PersonalInformation = ({
  errors,
  control,
  refetch,
  setValue,
  handleSubmit,
  setActiveTab,
}: OnboardingStepProps) => {
  const { setLocalStorage } = useLocalStorage();
  const [loading, setLoading] = useState(false);

  const watchedValues = useWatch({ control });

  const { countries, states, cities, getStatesByCountry, getCitiesByState } = useCountryStateCity();

  useEffect(() => {
    const hydrateLocation = async () => {
      if (
        countries.length > 0 &&
        typeof watchedValues?.country === 'string' &&
        isNaN(Number(watchedValues?.country))
      ) {
        const foundCountry = countries.find((c) => c.label === watchedValues?.country);
        if (foundCountry) {
          const countryId = String(foundCountry.value);
          setValue?.('country', countryId);

          const fetchedStates = await getStatesByCountry(Number(countryId));

          const stateLabel = watchedValues?.state;
          const foundState = fetchedStates?.find((s) => s.label === stateLabel);
          if (foundState) {
            const stateId = String(foundState.value);
            setValue?.('state', stateId);

            const fetchedCities = await getCitiesByState(Number(countryId), Number(stateId));

            const cityLabel = watchedValues?.city;
            const foundCity = fetchedCities?.find((c) => c.label === cityLabel);
            if (foundCity) {
              setValue?.('city', String(foundCity.value));
            }
          }
        }
      }
    };

    hydrateLocation();
  }, [countries, watchedValues?.country]);

  const handleChangeFile = async (file: File) => {
    if (!file?.name) return;
    try {
      setLoading(true);
      const payload = new FormData();
      payload.append('file', file);
      const response = await http.post(ENDPOINTS.CANDIDATE.UPLOAD_RESUME, payload);
      if (response?.data) {
        refetch?.();
        setLocalStorage('resumeData', JSON.stringify(response?.data?.structuredData));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    const country = (countries as any)?.find((c: any) => c.value === Number(data.country))?.label;
    const state = (states as any)?.find((s: any) => s.value === Number(data.state))?.label;
    const city = (cities as any)?.find((c: any) => c.value === Number(data.city))?.label;

    const payload = {
      firstName: data?.firstName,
      lastName: data?.lastName,
      headline: data?.headline,
      professionalSummary: data?.headline,
      summary: data?.summary,
      locationCity: city,
      locationState: state,
      locationCountry: country,
      city,
      state,
    };

    try {
      setLoading(true);
      await http.put(ENDPOINTS.CANDIDATE.UPDATE_PROFILE, payload);
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Personal information updated successfully',
      });
      setActiveTab?.('2');
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FileUploader accept="application/*" onChange={handleChangeFile} />
      {errors?.resume && <p className="text-red-500 text-sm">{errors?.resume?.message}</p>}

      {watchedValues?.resumes?.length > 0 && (
        <Resumes resumes={watchedValues?.resumes} refetch={refetch} isDeletable />
      )}

      <div className="grid gap-2   mt-5">
        {fields?.map((field) => {
          const fieldError = errors[field.name];

          return (
            <Controller
              key={field.name}
              name={field.name}
              control={control}
              render={({ field: inputProps }) => {
                if (field?.type === 'textarea') {
                  return (
                    <Textarea
                      {...inputProps}
                      readOnly={field.isDisabled}
                      labelPlacement="outside"
                      size="lg"
                      minRows={6}
                      placeholder={field.placeholder}
                      label={field.label}
                      isInvalid={!!fieldError}
                      className="mb-4"
                      errorMessage={fieldError?.message}
                    />
                  );
                }

                if (field?.type === 'select') {
                  const optionsMap: Record<string, any[]> = {
                    country: countries,
                    state: states,
                    city: cities,
                  };

                  const options = optionsMap[field.name] || [];

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
                      selectedKey={inputProps.value ? String(inputProps.value) : undefined}
                      onSelectionChange={async (key) => {
                        const value = key;
                        inputProps.onChange(value);

                        if (field.name === 'country') {
                          setValue?.('state', null);
                          setValue?.('city', null);
                          if (value) await getStatesByCountry(Number(value));
                        } else if (field.name === 'state') {
                          setValue?.('city', null);

                          const currentCountryId = control._formValues.country;

                          if (value && currentCountryId) {
                            await getCitiesByState(Number(currentCountryId), Number(value));
                          }
                        }
                      }}
                    >
                      {options.map((opt: any) => (
                        <AutocompleteItem key={String(opt.value)} textValue={opt.label}>
                          {opt.label}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  );
                }

                return (
                  <Input
                    {...inputProps}
                    readOnly={field.isDisabled}
                    labelPlacement="outside"
                    size="lg"
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
      </div>

      <div className="mt-2 flex justify-end">
        <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
};

export default PersonalInformation;

const fields = [
  {
    name: 'firstName',
    type: 'text',
    label: 'First name',
    placeholder: 'Example john',
    isDisabled: true,
  },
  {
    name: 'lastName',
    type: 'text',
    label: 'Last name',
    placeholder: 'Example deo',
    isDisabled: true,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    placeholder: '9834567890',
    isDisabled: true,
    type: 'number',
  },
  {
    name: 'email',
    type: 'text',
    label: 'Email',
    placeholder: 'example@email.com',
    isDisabled: true,
  },
  {
    name: 'headline',
    type: 'text',
    label: 'Headline',
    placeholder: 'Example headline',
    isDisabled: false,
  },
  {
    name: 'summary',
    type: 'textarea',
    label: 'Summary',
    placeholder: 'Example summary',
    isDisabled: false,
  },
  {
    name: 'country',
    type: 'select',
    label: 'Country',
    placeholder: 'Example country',
    isDisabled: false,
  },
  {
    name: 'state',
    type: 'select',
    label: 'State',
    placeholder: 'Example state',
    isDisabled: false,
  },
  {
    name: 'city',
    type: 'select',
    label: 'City',
    placeholder: 'Example city',
    isDisabled: false,
  },
];
