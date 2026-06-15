'use client';

import { companyTypeOptions } from '@/app/config/data';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import { OnboardingStepProps } from '@/app/types/types';
import { Alert, Autocomplete, AutocompleteItem, Button, Input } from '@heroui/react';
import { Controller, useWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { IoMdArrowForward } from 'react-icons/io';
import CommonUtils from '@/app/utils/commonUtils';
import RequiredLabel from '@/app/components/form/RequiredLabel';

interface Props extends OnboardingStepProps {
  enableSection: () => void;
}

const CompanyDetails = ({
  errors,
  control,
  handleSubmit,
  isSubmitting,
  setActiveTab,
  completeApiError,
  setCompleteApiError,
  enableSection,
  setValue,
}: Props) => {
  const { countries, states, cities, getStatesByCountry, getCitiesByState } = useCountryStateCity();
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const selectedCountry = useWatch({ control, name: 'country' });
  const selectedState = useWatch({ control, name: 'state' });

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

  const onSubmit = () => {
    setCompleteApiError?.('');
    enableSection();
    setActiveTab?.('2');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {completeApiError && (
        <Alert color="danger" className="mb-4" title={completeApiError} />
      )}

      {fields?.map((field, index) => {
        const fieldError = errors[field.name];
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            render={({ field: inputProps }) => {
              if (field.type === 'select') {
                const optionsMap: Record<string, any[]> = {
                  companyType: companyTypeOptions,
                  country: countries,
                  state: states,
                  city: cities,
                };
                const items = optionsMap[field.name] || [];
                const selectedLabel = items.find(
                  (item) => String(item.value) === String(inputProps.value),
                )?.label;
                const query = searchValues[field.name] || selectedLabel || '';
                const filteredItems = query
                  ? items.filter((item) =>
                      String(item.label).toLowerCase().includes(query.toLowerCase()),
                    )
                  : items;

                return (
                  <Autocomplete
                    {...inputProps}
                    label={<RequiredLabel isRequired={field.required}>{field.label}</RequiredLabel>}
                    placeholder={field.placeholder}
                    labelPlacement="outside"
                    size="lg"
                    className="mb-4"
                    isInvalid={!!fieldError}
                    errorMessage={fieldError?.message}
                    items={filteredItems}
                    inputValue={query}
                    onInputChange={(value) => {
                      setSearchValues((prev) => ({ ...prev, [field.name]: value }));
                    }}
                    selectedKey={inputProps.value ? String(inputProps.value) : undefined}
                    onSelectionChange={async (key) => {
                      setCompleteApiError?.('');
                      inputProps.onChange(key);
                      const selectedItem = items.find((item) => String(item.value) === String(key));
                      setSearchValues((prev) => ({
                        ...prev,
                        [field.name]: selectedItem?.label || '',
                      }));

                      if (field.name === 'country') {
                        setValue?.('state', '');
                        setValue?.('city', '');
                        setSearchValues((prev) => ({ ...prev, state: '', city: '' }));

                        if (key) {
                          await getStatesByCountry(String(key));
                        }
                      } else if (field.name === 'state') {
                        setValue?.('city', '');
                        setSearchValues((prev) => ({ ...prev, city: '' }));
                        const currentCountryId = control._formValues.country;

                        if (key && currentCountryId) {
                          await getCitiesByState(String(currentCountryId), String(key));
                        }
                      }
                    }}
                  >
                    {(item: any) => (
                      <AutocompleteItem key={String(item.value)} textValue={item.label}>
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                );
              }

              const handleTextChange = (inputValue: string) => {
                if (field.name === 'companyName') {
                  inputProps.onChange(CommonUtils.formatCompanyName(inputValue));
                  setCompleteApiError?.('');
                  return;
                }

                if (
                  field.name === 'panNumber' ||
                  field.name === 'gstNumber' ||
                  field.name === 'cinNumber'
                ) {
                  inputProps.onChange(CommonUtils.toUpperCase(inputValue));
                  setCompleteApiError?.('');
                  return;
                }

                inputProps.onChange(inputValue);
                setCompleteApiError?.('');
              };

                  return (
                    <Input
                      {...inputProps}
                      readOnly={field.isDisabled}
                  labelPlacement="outside"
                  size="lg"
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  label={<RequiredLabel isRequired={field.required}>{field.label}</RequiredLabel>}
                  isInvalid={!!fieldError}
                  className="mb-4"
                      errorMessage={fieldError?.message}
                      onChange={(event) => handleTextChange(event.target.value)}
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
          Next
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
    required: true,
  },
  {
    name: 'companyType',
    type: 'select',
    label: 'Company Type',
    placeholder: 'Example company type',
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
    name: 'panNumber',
    type: 'text',
    label: 'Pan Number',
    placeholder: 'Example pan number',
    isDisabled: false,
    required: true,
  },
  {
    name: 'gstNumber',
    type: 'text',
    label: 'GST Number',
    placeholder: 'Example gst number',
    isDisabled: false,
    required: false,
  },
  {
    name: 'cinNumber',
    type: 'text',
    label: 'Corporate Identification Number',
    placeholder: 'Example cin number',
    isDisabled: false,
    required: false,
  },
];
