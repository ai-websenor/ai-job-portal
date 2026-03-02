"use client";

import useCountryStateCity from "@/app/hooks/useCountryStateCity";
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Form,
  Input,
} from "@heroui/react";
import PhoneNumberInput from "../form/PhoneNumberInput";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useState } from "react";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import LoadingProgress from "../lib/LoadingProgress";
import { yupResolver } from "@hookform/resolvers/yup";
import { employeeProfileSchema } from "@/app/utils/validations";
import useGetProfile from "@/app/hooks/useGetProfile";

const EmployeePersonalDetails = () => {
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(employeeProfileSchema["1"]),
  });

  const watchedValues = useWatch({ control });

  const { cities, countries, getCitiesByState, getStatesByCountry, states } =
    useCountryStateCity();

  const getProfileData = async () => {
    setLoading(true);
    try {
      const res = await http.get(ENDPOINTS.EMPLOYER.PROFILE);
      const data = res?.data;
      if (data) {
        reset({
          firstName: data?.firstName,
          lastName: data?.lastName,
          email: data?.email,
          phone: data?.phone,
          country: data?.country,
          state: data?.state,
          city: data?.city,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    getProfileData();
  }, []);

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      country: countries.find((c) => String(c.value) === String(data.country))
        ?.label,
      state: states.find((s) => String(s.value) === String(data.state))?.label,
      city: cities.find((c) => String(c.value) === String(data.city))?.label,
    };

    delete payload.email;
    delete payload.phone;

    try {
      await http.put(ENDPOINTS.EMPLOYER.UPDATE_PROFILE, payload);
      getProfileData();
      getProfile();
      addToast({
        color: "success",
        title: "Success",
        description: "Personal information updated successfully",
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <LoadingProgress />;
  }

  return (
    <Form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full bg-white p-5 sm:p-10 rounded-lg"
    >
      <div className="grid sm:grid-cols-2 gap-5 sm:gap-10 w-full">
        {fields?.map((field, index) => {
          const fieldError: any = errors?.[field?.name as keyof typeof errors];

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

      <div className="mt-10 flex gap-3 justify-end w-full">
        <Button
          color="primary"
          size="md"
          type="submit"
          isLoading={isSubmitting}
        >
          Save
        </Button>
      </div>
    </Form>
  );
};

export default EmployeePersonalDetails;

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
