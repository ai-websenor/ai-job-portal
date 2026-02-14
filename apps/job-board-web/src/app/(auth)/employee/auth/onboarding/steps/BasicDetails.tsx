import PhoneNumberInput from "@/app/components/form/PhoneNumberInput";
import useCountryStateCity from "@/app/hooks/useCountryStateCity";
import { OnboardingStepProps } from "@/app/types/types";
import { Autocomplete, AutocompleteItem, Button, Input } from "@heroui/react";
import { Controller } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";

const BasicDetails = ({
  reset,
  errors,
  control,
  setValue,
  setActiveTab,
  isSubmitting,
  handleSubmit,
}: OnboardingStepProps) => {
  const { countries, states, cities, getStatesByCountry, getCitiesByState } =
    useCountryStateCity();

  const onSubmit = async (data: any) => {
    reset?.();
    setActiveTab?.("2");
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
              if (field?.type === "phone") {
                return (
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="text-sm font-medium text-foreground-600">
                      Mobile
                    </label>
                    <PhoneNumberInput
                      value={inputProps.value as string}
                      onChange={inputProps.onChange}
                    />
                    {fieldError && (
                      <p className="text-tiny text-danger">
                        {fieldError.message}
                      </p>
                    )}
                  </div>
                );
              }

              if (field?.type === "select") {
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
                    selectedKey={
                      inputProps.value ? String(inputProps.value) : undefined
                    }
                    onSelectionChange={async (key) => {
                      const value = key;
                      inputProps.onChange(value);

                      if (field.name === "country") {
                        setValue?.("state", null);
                        setValue?.("city", null);
                        if (value) await getStatesByCountry(Number(value));
                      } else if (field.name === "state") {
                        setValue?.("city", null);

                        const currentCountryId = control._formValues.country;

                        if (value && currentCountryId) {
                          await getCitiesByState(
                            Number(currentCountryId),
                            Number(value),
                          );
                        }
                      }
                    }}
                  >
                    {options.map((opt: any) => (
                      <AutocompleteItem
                        key={String(opt.value)}
                        textValue={opt.label}
                      >
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

export default BasicDetails;

const fields = [
  {
    name: "firstName",
    type: "text",
    label: "First name",
    placeholder: "Example john",
    isDisabled: false,
  },
  {
    name: "lastName",
    type: "text",
    label: "Last name",
    placeholder: "Example deo",
    isDisabled: false,
  },
  {
    name: "phone",
    label: "Phone Number",
    placeholder: "9834567890",
    isDisabled: false,
    type: "phone",
  },
  {
    name: "email",
    type: "text",
    label: "Email",
    placeholder: "Example@email.com",
    isDisabled: false,
  },
  {
    name: "country",
    type: "select",
    label: "Country",
    placeholder: "Example country",
    isDisabled: false,
  },
  {
    name: "state",
    type: "select",
    label: "State",
    placeholder: "Example state",
    isDisabled: false,
  },
  {
    name: "city",
    type: "select",
    label: "City",
    placeholder: "Example city",
    isDisabled: false,
  },
];
