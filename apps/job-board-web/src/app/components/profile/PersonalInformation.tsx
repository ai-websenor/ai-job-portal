"use client";

import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
} from "@heroui/react";
import { Controller, useWatch } from "react-hook-form";
import PhoneNumberInput from "../form/PhoneNumberInput";
import useCountryStateCity from "@/app/hooks/useCountryStateCity";
import { ProfileEditProps } from "@/app/types/types";
import { useEffect, useState } from "react";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";

const PersonalInformation = ({
  errors,
  control,
  setValue,
  refetch,
  isSubmitting,
  handleSubmit,
}: ProfileEditProps) => {
  const [showForm, setShowForm] = useState(false);
  const { cities, countries, getCitiesByState, getStatesByCountry, states } =
    useCountryStateCity();

  const watchedValues = useWatch({ control });

  useEffect(() => {
    const hydrateLocation = async () => {
      if (
        countries.length > 0 &&
        typeof watchedValues?.country === "string" &&
        isNaN(Number(watchedValues?.country))
      ) {
        const foundCountry = countries.find(
          (c) => c.label === watchedValues?.country,
        );
        if (foundCountry) {
          const countryId = String(foundCountry.value);
          setValue("country", countryId);

          const fetchedStates = await getStatesByCountry(Number(countryId));

          const stateLabel = watchedValues?.state;
          const foundState = fetchedStates?.find((s) => s.label === stateLabel);
          if (foundState) {
            const stateId = String(foundState.value);
            setValue("state", stateId);

            const fetchedCities = await getCitiesByState(
              Number(countryId),
              Number(stateId),
            );

            const cityLabel = watchedValues?.city;
            const foundCity = fetchedCities?.find((c) => c.label === cityLabel);
            if (foundCity) {
              setValue("city", String(foundCity.value));
            }
          }
        }
      }
    };

    hydrateLocation();
  }, [countries, watchedValues?.country]);

  const toggleForm = () => setShowForm(!showForm);

  const renderValue = (fieldName: string) => {
    const val = watchedValues?.[fieldName];
    if (!val) return "Not provided";

    if (fieldName === "country")
      return (
        countries.find((c) => String(c.value) === String(val))?.label || val
      );
    if (fieldName === "state")
      return states.find((s) => String(s.value) === String(val))?.label || val;
    if (fieldName === "city")
      return cities.find((c) => String(c.value) === String(val))?.label || val;

    return val;
  };

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    payload.country =
      countries.find((c) => String(c.value) === String(data.country))?.label ||
      "";
    payload.state =
      states.find((s) => String(s.value) === String(data.state))?.label || "";
    payload.city =
      cities.find((c) => String(c.value) === String(data.city))?.label || "";

    delete payload.phone;

    try {
      await http.put(ENDPOINTS.CANDIDATE.UPDATE_PROFILE, payload);
      refetch?.();
      addToast({
        color: "success",
        title: "Success",
        description: "Personal information updated successfully",
      });
      toggleForm();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Personal Information</h1>
        {!showForm && (
          <Button color="primary" size="sm" variant="flat" onPress={toggleForm}>
            Edit
          </Button>
        )}
      </div>
      {!showForm ? (
        <div className="grid sm:grid-cols-2 gap-6">
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-10">
            {fields?.map((field, index) => {
              const fieldError = errors?.[field?.name as keyof typeof errors];
              return (
                <Controller
                  key={index}
                  name={field.name as any}
                  control={control}
                  render={({ field: inputProps }) => {
                    switch (field?.type) {
                      case "phone":
                        return (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-foreground-600">
                              {field.label}
                            </label>
                            <PhoneNumberInput
                              disabled
                              value={inputProps.value as string}
                              onChange={inputProps.onChange}
                              placeholder={field.placeholder}
                            />
                            {fieldError && (
                              <p className="text-tiny text-danger">
                                {fieldError?.message}
                              </p>
                            )}
                          </div>
                        );

                      case "autocomplete":
                        const dataOptions =
                          field.name === "country"
                            ? countries
                            : field.name === "state"
                              ? states
                              : cities;

                        return (
                          <Autocomplete
                            {...inputProps}
                            label={field.label}
                            placeholder={field.placeholder}
                            labelPlacement="outside"
                            size="lg"
                            selectedKey={inputProps.value}
                            isInvalid={!!fieldError}
                            errorMessage={fieldError?.message}
                            onSelectionChange={async (value) => {
                              inputProps.onChange(value);
                              if (field.name === "country" && value) {
                                await getStatesByCountry(Number(value));
                              } else if (field.name === "state" && value) {
                                await getCitiesByState(
                                  Number(watchedValues?.country),
                                  Number(value),
                                );
                              }
                            }}
                          >
                            {dataOptions.map((item) => (
                              <AutocompleteItem
                                key={String(item.value)}
                                textValue={item.label}
                              >
                                {item.label}
                              </AutocompleteItem>
                            ))}
                          </Autocomplete>
                        );

                      default:
                        return (
                          <Input
                            {...inputProps}
                            autoFocus={index === 0}
                            label={field.label}
                            placeholder={field.placeholder}
                            labelPlacement="outside"
                            size="lg"
                            isInvalid={!!fieldError}
                            errorMessage={fieldError?.message}
                          />
                        );
                    }
                  }}
                />
              );
            })}
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button
              color="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
            >
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PersonalInformation;

const fields = [
  {
    name: "firstName",
    label: "First Name",
    placeholder: "Enter your first name",
    type: "text",
  },
  {
    name: "lastName",
    label: "Last Name",
    placeholder: "Enter your last name",
    type: "text",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email",
    type: "text",
  },
  {
    name: "phone",
    label: "Phone Number",
    placeholder: "Enter your phone number",
    type: "phone",
  },
  {
    name: "country",
    label: "Country",
    placeholder: "Select your country",
    type: "autocomplete",
  },
  {
    name: "state",
    label: "State",
    placeholder: "Select your state",
    type: "autocomplete",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Select your city",
    type: "autocomplete",
  },
];
