'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { OnboardingStepProps } from '@/app/types/types';
import { Alert, Autocomplete, AutocompleteItem, Button, Input } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import CommonUtils from '@/app/utils/commonUtils';
import RequiredLabel from '@/app/components/form/RequiredLabel';
import OnboardingSuccessDialog from '../../../../../components/dialogs/OnboardingSuccessDialog';
import { createFormattedInputChangeHandler } from '@/app/utils/inputUtils';

const BasicDetails = ({
  errors,
  control,
  setValue,
  setActiveTab,
  isSubmitting,
  handleSubmit,
  isBasicDetailsSaved = false,
  setIsBasicDetailsSaved,
  setCompleteApiError,
  reset,
  companyDetails,
}: OnboardingStepProps & { companyDetails?: any }) => {
  const router = useRouter();
  const params = useSearchParams();
  const sessionToken = params.get('sessionToken');
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isVisible, setIsVisible] = useState({
    password: false,
    confirmPassword: false,
  });

  const { countries, states, cities, getStatesByCountry, getCitiesByState } = useCountryStateCity();
  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });
  const areBasicFieldsDisabled = isBasicDetailsSaved || Boolean(isSubmitting);

  useEffect(() => {
    let isActive = true;

    const hydrateLocationOptions = async () => {
      if (!selectedCountry) return;

      const loadedStates = await getStatesByCountry(String(selectedCountry));

      if (!isActive || !selectedState) return;

      const hasSelectedState = loadedStates?.some(
        (state: any) => String(state.value) === String(selectedState),
      );

      if (hasSelectedState) {
        await getCitiesByState(String(selectedCountry), String(selectedState));
      }
    };

    hydrateLocationOptions();

    return () => {
      isActive = false;
    };
  }, [selectedCountry, selectedState, getStatesByCountry, getCitiesByState]);

  const toggleVisibility = (field: keyof typeof isVisible) => {
    setIsVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleProceed = () => {
    setIsSuccessOpen(false);
    setLocalStorage('isOnboardingCompleted', true);
    router.replace(`${routePaths.employee.profile}?tab=2`);
  };

  const completeOnboarding = async () => {
    const companyCountry = (countries as any)?.find((c: any) => c.value === companyDetails?.country)?.label;
    const companyState = (states as any)?.find((s: any) => s.value === companyDetails?.state)?.label;
    const companyCity = (cities as any)?.find((c: any) => c.value === companyDetails?.city)?.label;

    const companyDetailsPayload = {
      companyName: companyDetails?.companyName ?? null,
      companyType: companyDetails?.companyType ?? null,
      country: companyCountry,
      state: companyState,
      city: companyCity,
      panNumber: companyDetails?.panNumber ?? null,
      gstNumber: companyDetails?.gstNumber?.trim?.() ? companyDetails?.gstNumber : null,
      cinNumber: companyDetails?.cinNumber?.trim?.() ? companyDetails?.cinNumber : null,
      sessionToken,
    };

    try {
      setCompleteApiError?.('');
      const response = await http.post(
        ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.COMPANY_DETAILS,
        companyDetailsPayload,
      );

      const result = response?.data;

      if (!result) {
        setCompleteApiError?.('Something went wrong');
        setActiveTab?.('1');
        return;
      }

      reset?.();

      setLocalStorage('token', result?.accessToken);
      setLocalStorage('refreshToken', result?.refreshToken);
      setUser({
        ...result?.user,
        company: result?.company,
      });
      setIsSuccessOpen(true);
    } catch (error: any) {
      setCompleteApiError?.(error?.message || 'Something went wrong');
      setActiveTab?.('1');
      console.log(error);
    }
  };

  const onSubmit = async (data: any) => {
    if (isBasicDetailsSaved) {
      await completeOnboarding();
      return;
    }

    const country = (countries as any)?.find((c: any) => c.value === data.country)?.label;
    const state = (states as any)?.find((s: any) => s.value === data.state)?.label;
    const city = (cities as any)?.find((c: any) => c.value === data.city)?.label;

    const basicDetailsPayload = {
      firstName: data.firstName ?? null,
      middleName: data.middleName?.trim?.() ? data.middleName : null,
      lastName: data.lastName ?? null,
      country,
      state,
      city,
      password: data.password,
      confirmPassword: data.confirmPassword,
      sessionToken,
      accountType: 'company',
    };

    try {
      await http.post(ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.USER_DETAILS, basicDetailsPayload);
      setIsBasicDetailsSaved?.(true);
    } catch (error) {
      setActiveTab?.('2');
      console.log(error);
      return;
    }

    await completeOnboarding();
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
        {isBasicDetailsSaved && (
          <Alert color="success" className="mb-4" title="Profile created successfully">
            You can save company details.
          </Alert>
        )}

        {fields?.map((field, index) => {
          const fieldError = errors[field.name];

          const inputType =
            field.type === 'password'
              ? isVisible[field?.name as keyof typeof isVisible]
                ? 'text'
                : 'password'
              : field.type;

          return (
            <Controller
              key={field.name}
              name={field.name}
              control={control}
              render={({ field: inputProps }) => {
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
                      label={<RequiredLabel isRequired={field.required}>{field.label}</RequiredLabel>}
                      placeholder={field.placeholder}
                      labelPlacement="outside"
                      size="lg"
                      className="mb-4"
                      isDisabled={areBasicFieldsDisabled}
                      isInvalid={!!fieldError}
                      errorMessage={fieldError?.message}
                      selectedKey={inputProps.value ? String(inputProps.value) : undefined}
                      onSelectionChange={async (key) => {
                        const value = key;
                        inputProps.onChange(value);

                        if (field.name === 'country') {
                          setValue?.('state', null);
                          setValue?.('city', null);
                          if (value) await getStatesByCountry(String(value));
                        } else if (field.name === 'state') {
                          setValue?.('city', null);

                          const currentCountryId = control._formValues.country;

                          if (value && currentCountryId) {
                            await getCitiesByState(String(currentCountryId), String(value));
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

                const isMiddleNameField = field.name === 'middleName';
                const isFirstOrLastNameField = field.name === 'firstName' || field.name === 'lastName';
                const isNameField = isFirstOrLastNameField || field.name === 'middleName';

                const formattedChangeHandler = isFirstOrLastNameField
                  ? createFormattedInputChangeHandler(inputProps.onChange, (value) =>
                      CommonUtils.formatPersonName(value, { allowSpaces: false }),
                    )
                  : isMiddleNameField
                    ? createFormattedInputChangeHandler(inputProps.onChange, (value) =>
                        CommonUtils.formatPersonName(value),
                      )
                    : isNameField
                      ? createFormattedInputChangeHandler(inputProps.onChange, (value) =>
                          CommonUtils.toCamelCase(value),
                        )
                      : createFormattedInputChangeHandler(inputProps.onChange);

                return (
                  <Input
                    {...inputProps}
                    readOnly={field.isDisabled}
                    isDisabled={areBasicFieldsDisabled || field.isDisabled}
                    labelPlacement="outside"
                    size="lg"
                    type={inputType}
                    autoFocus={index === 0}
                    placeholder={field.placeholder}
                    label={<RequiredLabel isRequired={field.required}>{field.label}</RequiredLabel>}
                    isInvalid={!!fieldError}
                    className="mb-4"
                    errorMessage={fieldError?.message}
                    onKeyDown={(event) => {
                      if (
                        isFirstOrLastNameField &&
                        event.key.length === 1 &&
                        !CommonUtils.isPersonNameCharacter(event.key, { allowSpaces: false })
                      ) {
                        event.preventDefault();
                        return;
                      }

                      if (
                        isMiddleNameField &&
                        event.key.length === 1 &&
                        !CommonUtils.isPersonNameCharacter(event.key)
                      ) {
                        event.preventDefault();
                        return;
                      }

                      if (isFirstOrLastNameField && event.key === ' ') {
                        event.preventDefault();
                      }
                    }}
                    endContent={
                      field?.type === 'password' && (
                        <button
                          type="button"
                          disabled={areBasicFieldsDisabled}
                          onClick={() => toggleVisibility(field?.name as keyof typeof isVisible)}
                          className="focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isVisible[field?.name as keyof typeof isVisible] ? (
                            <IoEyeOutline className="text-default-400" />
                          ) : (
                            <IoEyeOffOutline className="text-default-400" />
                          )}
                        </button>
                      )
                    }
                    onChange={formattedChangeHandler}
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
            {isSubmitting ? 'Saving' : 'Finish'}
          </Button>
        </div>
      </form>
      <OnboardingSuccessDialog
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        onProceed={handleProceed}
      />
    </>
  );
};

export default BasicDetails;

const fields = [
  {
    name: 'firstName',
    type: 'text',
    label: 'First Name',
    placeholder: 'Example john',
    isDisabled: false,
    required: true,
  },
  {
    name: 'middleName',
    type: 'text',
    label: 'Middle Name',
    placeholder: 'Example michael',
    isDisabled: false,
    required: false,
  },
  {
    name: 'lastName',
    type: 'text',
    label: 'Last Name',
    placeholder: 'Example deo',
    isDisabled: false,
    required: true,
  },
  {
    name: 'country',
    type: 'select',
    label: 'Country',
    placeholder: 'Example country',
    isDisabled: false,
    required: true,
  },
  {
    name: 'state',
    type: 'select',
    label: 'State',
    placeholder: 'Example state',
    isDisabled: false,
    required: true,
  },
  {
    name: 'city',
    type: 'select',
    label: 'City',
    placeholder: 'Example city',
    isDisabled: false,
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'At least 8 characters',
    required: true,
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'At least 8 characters',
    required: true,
  },
];
