"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import useCountryStateCity from "@/app/hooks/useCountryStateCity";
import { OnboardingStepProps } from "@/app/types/types";
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
} from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

const BasicDetails = ({
  errors,
  control,
  setValue,
  setActiveTab,
  isSubmitting,
  handleSubmit,
}: OnboardingStepProps) => {
  const params = useSearchParams();
  const sessionToken = params.get("sessionToken");
  const [isVisible, setIsVisible] = useState({
    password: false,
    confirmPassword: false,
  });

  const { countries, states, cities, getStatesByCountry, getCitiesByState } =
    useCountryStateCity();

  const toggleVisibility = (field: keyof typeof isVisible) => {
    setIsVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const onSubmit = async (data: any) => {
    const country = (countries as any)?.find(
      (c: any) => c.value === Number(data.country),
    )?.label;
    const state = (states as any)?.find(
      (s: any) => s.value === Number(data.state),
    )?.label;
    const city = (cities as any)?.find(
      (c: any) => c.value === Number(data.city),
    )?.label;

    const payload = {
      ...data,
      country,
      state,
      city,
      sessionToken: sessionToken,
      accountType: "company",
    };

    try {
      await http.post(ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.USER_DETAILS, payload);
      addToast({
        color: "success",
        title: "Success",
        description: "Personal details submitted",
      });
      setActiveTab?.("2");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field, index) => {
        const fieldError = errors[field.name];

        const inputType =
          field.type === "password"
            ? isVisible[field?.name as keyof typeof isVisible]
              ? "text"
              : "password"
            : field.type;

        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            render={({ field: inputProps }) => {
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
                  type={inputType}
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  label={field.label}
                  isInvalid={!!fieldError}
                  className="mb-4"
                  errorMessage={fieldError?.message}
                  endContent={
                    field?.type === "password" && (
                      <button
                        type="button"
                        onClick={() =>
                          toggleVisibility(
                            field?.name as keyof typeof isVisible,
                          )
                        }
                        className="focus:outline-none"
                      >
                        {isVisible[field?.name as keyof typeof isVisible] ? (
                          <IoEyeOutline className="text-default-400" />
                        ) : (
                          <IoEyeOffOutline className="text-default-400" />
                        )}
                      </button>
                    )
                  }
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
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "At least 8 characters",
  },
  {
    name: "confirmPassword",
    type: "password",
    label: "Confirm Password",
    placeholder: "At least 8 characters",
  },
];
