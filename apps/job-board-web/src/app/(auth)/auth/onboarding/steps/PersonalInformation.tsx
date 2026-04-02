'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import { OnboardingStepProps } from '@/app/types/types';
import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Avatar,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { IoMdArrowForward } from 'react-icons/io';
import { FaLinkedin, FaGithub, FaCamera } from 'react-icons/fa';
import { HiGlobeAlt } from 'react-icons/hi';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import OnboardingResume from '../OnboardingResume';
import PhoneNumberInput from '@/app/components/form/PhoneNumberInput';

const PersonalInformation = ({
  errors,
  control,
  refetch,
  setValue,
  handleSubmit,
  handleNext,
  onStructuredData,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target?.files?.[0];
    if (!file) return;
    try {
      setPhotoLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      await http.post(ENDPOINTS.CANDIDATE.PROFILE_PHOTO, formData);
      refetch?.();
      addToast({ color: 'success', title: 'Photo Updated' });
    } catch (error) {
      console.debug('[PersonalInfo] photo upload error:', error);
      addToast({ color: 'danger', title: 'Upload Failed', description: 'Could not upload photo.' });
    } finally {
      setPhotoLoading(false);
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
      gender: data?.gender || undefined,
      linkedinUrl: data?.linkedinUrl || undefined,
      githubUrl: data?.githubUrl || undefined,
      websiteUrl: data?.websiteUrl || undefined,
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
      handleNext?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  // Helper to render a controlled field
  const renderField = (fieldName: string) => {
    const field = fieldMap[fieldName];
    if (!field) return null;
    const fieldError = errors[field.name];

    return (
      <Controller
        key={field.name}
        name={field.name}
        control={control}
        render={({ field: inputProps }) => {
          const safeProps = { ...inputProps, value: inputProps.value ?? '' };

          if (field.name === 'phone' && !watchedValues?.isMobileDisabled) {
            return (
              <div className="flex flex-col gap-1">
                <PhoneNumberInput
                  value={safeProps.value as string}
                  onChange={safeProps.onChange}
                  placeholder={field.placeholder}
                />
                {fieldError && <p className="text-tiny text-danger">{fieldError.message}</p>}
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <Textarea
                {...safeProps}
                readOnly={field.isDisabled}
                labelPlacement="outside"
                size="md"
                minRows={4}
                placeholder={field.placeholder}
                label={field.label}
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
              />
            );
          }

          if (field.type === 'gender') {
            return (
              <Select
                {...safeProps}
                label={field.label}
                placeholder={field.placeholder}
                labelPlacement="outside"
                size="md"
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                selectedKeys={safeProps.value ? [safeProps.value] : []}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  safeProps.onChange(val || '');
                }}
              >
                {genderOptions.map((opt) => (
                  <SelectItem key={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>
            );
          }

          if (field.type === 'url') {
            const iconMap: Record<string, React.ReactNode> = {
              linkedinUrl: <FaLinkedin className="text-[#0A66C2]" size={18} />,
              githubUrl: <FaGithub className="text-gray-800" size={18} />,
              websiteUrl: <HiGlobeAlt className="text-primary" size={18} />,
            };
            return (
              <Input
                {...safeProps}
                type="url"
                labelPlacement="outside"
                size="md"
                placeholder={field.placeholder}
                label={field.label}
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                startContent={iconMap[field.name]}
              />
            );
          }

          if (field.type === 'select') {
            const optionsMap: Record<string, any[]> = {
              country: countries,
              state: states,
              city: cities,
            };
            const options = optionsMap[field.name] || [];

            return (
              <Autocomplete
                {...safeProps}
                label={field.label}
                placeholder={field.placeholder}
                labelPlacement="outside"
                size="md"
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                selectedKey={safeProps.value ? String(safeProps.value) : undefined}
                onSelectionChange={async (key) => {
                  safeProps.onChange(key);
                  if (field.name === 'country') {
                    setValue?.('state', '');
                    setValue?.('city', '');
                    if (key) await getStatesByCountry(Number(key));
                  } else if (field.name === 'state') {
                    setValue?.('city', '');
                    const currentCountryId = control._formValues.country;
                    if (key && currentCountryId) {
                      await getCitiesByState(Number(currentCountryId), Number(key));
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
              {...safeProps}
              readOnly={field.isDisabled}
              labelPlacement="outside"
              size="md"
              placeholder={field.placeholder}
              label={field.label}
              isInvalid={!!fieldError}
              errorMessage={fieldError?.message}
            />
          );
        }}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Resume Upload */}
      <OnboardingResume
        refetch={refetch}
        setLoading={setLoading}
        errors={errors}
        watchedValues={watchedValues}
        onStructuredData={onStructuredData}
      />

      {/* ── Profile Photo (centered) ── */}
      <div className="flex flex-col items-center">
        <div
          className="relative group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar
            src={watchedValues?.profilePhoto || ''}
            name={`${watchedValues?.firstName || ''} ${watchedValues?.lastName || ''}`}
            className="w-32 h-32"
            isBordered
            color="primary"
          />
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {photoLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaCamera className="text-white" size={20} />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={photoLoading}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">Click to upload photo</p>
      </div>

      {/* ── Section: Name + Headline ── */}
      <div className="grid grid-cols-2 gap-4">
        {renderField('firstName')}
        {renderField('lastName')}
        <div className="col-span-2">
          {renderField('headline')}
        </div>
      </div>

      {/* ── Section: Contact & Identity ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2 w-full">
          Contact & Identity
        </legend>
        <div className="grid grid-cols-2 gap-4">
          {renderField('email')}
          {renderField('phone')}
          {renderField('gender')}
        </div>
      </fieldset>

      {/* ── Section: About ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2 w-full">
          About
        </legend>
        {renderField('summary')}
      </fieldset>

      {/* ── Section: Location ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2 w-full">
          Location
        </legend>
        <div className="grid grid-cols-3 gap-4">
          {renderField('country')}
          {renderField('state')}
          {renderField('city')}
        </div>
      </fieldset>

      {/* ── Section: Links ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2 w-full">
          Links
        </legend>
        <div className="grid grid-cols-1 gap-4">
          {renderField('linkedinUrl')}
          {renderField('githubUrl')}
          {renderField('websiteUrl')}
        </div>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
          Save & Continue
        </Button>
      </div>
    </form>
  );
};

export default PersonalInformation;

// ── Static Data ──

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'not_specified', label: 'Prefer not to say' },
];

type FieldDef = {
  name: string;
  type: string;
  label: string;
  placeholder: string;
  isDisabled: boolean;
};

const fieldDefs: FieldDef[] = [
  { name: 'firstName', type: 'text', label: 'First Name', placeholder: 'John', isDisabled: false },
  { name: 'lastName', type: 'text', label: 'Last Name', placeholder: 'Doe', isDisabled: false },
  { name: 'headline', type: 'text', label: 'Professional Headline', placeholder: 'Senior Software Engineer at Google', isDisabled: false },
  { name: 'phone', label: 'Phone', placeholder: '+91 98765 43210', isDisabled: true, type: 'number' },
  { name: 'email', type: 'text', label: 'Email', placeholder: 'john@example.com', isDisabled: true },
  { name: 'gender', type: 'gender', label: 'Gender', placeholder: 'Select', isDisabled: false },
  { name: 'summary', type: 'textarea', label: 'Professional Summary', placeholder: 'Describe your experience, skills, and what you bring to the table...', isDisabled: false },
  { name: 'country', type: 'select', label: 'Country', placeholder: 'Select country', isDisabled: false },
  { name: 'state', type: 'select', label: 'State', placeholder: 'Select state', isDisabled: false },
  { name: 'city', type: 'select', label: 'City', placeholder: 'Select city', isDisabled: false },
  { name: 'linkedinUrl', type: 'url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile', isDisabled: false },
  { name: 'githubUrl', type: 'url', label: 'GitHub', placeholder: 'https://github.com/yourusername', isDisabled: false },
  { name: 'websiteUrl', type: 'url', label: 'Portfolio / Website', placeholder: 'https://yoursite.com', isDisabled: false },
];

// Quick lookup by field name
const fieldMap: Record<string, FieldDef> = Object.fromEntries(fieldDefs.map((f) => [f.name, f]));
