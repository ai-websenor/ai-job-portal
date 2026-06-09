'use client';

import { companyTypeOptions } from '@/app/config/data';
import { OnboardingStepProps } from '@/app/types/types';
import { Alert, Autocomplete, AutocompleteItem, Button, Input } from '@heroui/react';
import { Controller } from 'react-hook-form';
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
}: Props) => {
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
                };

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
                    items={optionsMap[field.name]}
                    selectedKey={inputProps.value ? String(inputProps.value) : undefined}
                    onSelectionChange={(key) => {
                      setCompleteApiError?.('');
                      inputProps.onChange(key);
                    }}
                  >
                    {(item: any) => (
                      <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>
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
