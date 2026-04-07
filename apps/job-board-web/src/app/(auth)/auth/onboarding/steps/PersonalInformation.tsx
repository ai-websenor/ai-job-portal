'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import { OnboardingStepProps } from '@/app/types/types';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { IoMdArrowForward } from 'react-icons/io';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import { HiGlobeAlt, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { CgSpinner } from 'react-icons/cg';
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
  isResumeMode,
  onResumeModeChange,
}: OnboardingStepProps & {
  isResumeMode?: boolean;
  onResumeModeChange?: (val: boolean) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<
    Record<string, 'idle' | 'loading' | 'success' | 'failed'>
  >({});

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

  const handleVerifyUrl = async (fieldName: string, url: string) => {
    if (!url) return;
    setVerifyStatus((prev) => ({ ...prev, [fieldName]: 'loading' }));
    try {
      const res = await http.post(ENDPOINTS.CANDIDATE.VERIFY_URL, { url });
      const accessible = res?.data?.data?.accessible ?? res?.data?.accessible;
      setVerifyStatus((prev) => ({ ...prev, [fieldName]: accessible ? 'success' : 'failed' }));
    } catch {
      setVerifyStatus((prev) => ({ ...prev, [fieldName]: 'failed' }));
    }
  };

  const onSubmit = async (data: any) => {
    console.debug('[PersonalInfo] onSubmit data:', data);

    // Location: form stores numeric IDs (from Autocomplete) or string names (from resume parse)
    const countryLabel =
      (countries as any)?.find((c: any) => c.value === Number(data.country))?.label ||
      data.country ||
      '';
    const stateLabel =
      (states as any)?.find((s: any) => s.value === Number(data.state))?.label || data.state || '';
    const cityLabel =
      (cities as any)?.find((c: any) => c.value === Number(data.city))?.label || data.city || '';

    const payload = {
      firstName: data?.firstName,
      lastName: data?.lastName,
      headline: data?.headline || undefined,
      summary: data?.summary || undefined,
      locationCity: cityLabel || undefined,
      locationState: stateLabel || undefined,
      locationCountry: countryLabel || undefined,
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

  // Shared style tokens
  const editableStyles: Record<string, string> = {
    inputWrapper: 'bg-white border border-gray-200 hover:border-primary/40',
  };
  const disabledStyles = {
    inputWrapper: 'bg-gray-100 border border-gray-200 cursor-not-allowed',
    input: 'text-gray-400',
  };

  // Helper to render a controlled field
  const renderField = (fieldName: string) => {
    const field = fieldMap[fieldName];
    if (!field) return null;
    const fieldError = errors[field.name];
    const styles = field.isDisabled ? disabledStyles : editableStyles;

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
                variant="bordered"
                labelPlacement="outside"
                size="md"
                minRows={4}
                maxRows={12}
                placeholder={field.placeholder}
                label={field.label}
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                classNames={{ ...styles, input: `${styles.input || ''} resize-y`.trim() }}
              />
            );
          }

          if (field.type === 'gender') {
            return (
              <Select
                {...safeProps}
                label={field.label}
                placeholder={field.placeholder}
                variant="bordered"
                labelPlacement="outside"
                size="md"
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                classNames={{ trigger: 'bg-white border border-gray-200 hover:border-primary/40' }}
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
            const prefixMap: Record<string, string> = {
              linkedinUrl: 'https://linkedin.com/in/',
              githubUrl: 'https://github.com/',
            };
            const iconMap: Record<string, React.ReactNode> = {
              linkedinUrl: <FaLinkedin className="text-[#0A66C2]" size={18} />,
              githubUrl: <FaGithub className="text-gray-800" size={18} />,
              websiteUrl: <HiGlobeAlt className="text-primary" size={18} />,
            };
            const prefix = prefixMap[field.name];
            // Strip any prefix variant from stored value for display
            let displayValue = safeProps.value;
            if (prefix && typeof displayValue === 'string') {
              const variants = [
                prefix,
                prefix.replace('://', '://www.'),
                prefix.replace('https://', 'http://'),
                prefix.replace('https://', 'http://www.'),
              ];
              for (const v of variants) {
                if (displayValue.startsWith(v)) {
                  displayValue = displayValue.slice(v.length);
                  break;
                }
              }
            }
            const fullUrl = prefix
              ? displayValue
                ? `${prefix}${displayValue}`
                : ''
              : (safeProps.value as string);

            const status = verifyStatus[field.name] || 'idle';
            const verifyIcon = (() => {
              if (!fullUrl) return null;
              const icon = (() => {
                if (status === 'loading')
                  return <CgSpinner className="animate-spin text-gray-400" size={18} />;
                if (status === 'success')
                  return <HiCheckCircle className="text-green-500" size={20} />;
                if (status === 'failed') return <HiXCircle className="text-red-500" size={20} />;
                return (
                  <button
                    type="button"
                    onClick={() => handleVerifyUrl(field.name, fullUrl)}
                    className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                  >
                    Verify
                  </button>
                );
              })();
              return <div className="flex-shrink-0 flex items-center">{icon}</div>;
            })();

            const startEl = prefix ? (
              <div className="flex items-center gap-1.5 pr-1 border-r border-gray-200 mr-1">
                {iconMap[field.name]}
                <span className="text-xs text-gray-400 whitespace-nowrap">{prefix}</span>
              </div>
            ) : (
              iconMap[field.name]
            );

            return (
              <Input
                {...safeProps}
                value={displayValue ?? ''}
                onChange={(e) => {
                  let raw = e.target.value;
                  // If user pastes full URL, strip any prefix variant
                  if (prefix && raw) {
                    const variants = [
                      prefix,
                      prefix.replace('://', '://www.'),
                      prefix.replace('https://', 'http://'),
                      prefix.replace('https://', 'http://www.'),
                    ];
                    for (const v of variants) {
                      if (raw.startsWith(v)) {
                        raw = raw.slice(v.length);
                        break;
                      }
                    }
                  }
                  safeProps.onChange(prefix ? (raw ? `${prefix}${raw}` : '') : raw);
                  if (verifyStatus[field.name]) {
                    setVerifyStatus((prev) => ({ ...prev, [field.name]: 'idle' }));
                  }
                }}
                type={prefix ? 'text' : 'url'}
                variant="bordered"
                labelPlacement="outside"
                size="md"
                placeholder={prefix ? 'your-username' : field.placeholder}
                label={field.label}
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                startContent={startEl}
                endContent={verifyIcon}
                classNames={editableStyles}
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
                variant="bordered"
                labelPlacement="outside"
                size="md"
                isInvalid={!!fieldError}
                errorMessage={fieldError?.message}
                inputProps={{ classNames: editableStyles }}
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
              variant="bordered"
              labelPlacement="outside"
              size="md"
              placeholder={field.placeholder}
              label={field.label}
              isInvalid={!!fieldError}
              errorMessage={fieldError?.message}
              classNames={styles}
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
        onModeChange={onResumeModeChange}
      />

      {isResumeMode ? null : (
        <>
          {/* ── Section: Name + Headline ── */}
          <div className="grid grid-cols-2 gap-4">
            {renderField('firstName')}
            {renderField('lastName')}
            <div className="col-span-2">{renderField('headline')}</div>
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

          {/* ── Actions ── */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
              Save & Continue
            </Button>
          </div>
        </>
      )}
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
  {
    name: 'headline',
    type: 'text',
    label: 'Professional Headline',
    placeholder: 'Senior Software Engineer at Google',
    isDisabled: false,
  },
  {
    name: 'phone',
    label: 'Phone',
    placeholder: '+91 98765 43210',
    isDisabled: true,
    type: 'number',
  },
  {
    name: 'email',
    type: 'text',
    label: 'Email',
    placeholder: 'john@example.com',
    isDisabled: true,
  },
  { name: 'gender', type: 'gender', label: 'Gender', placeholder: 'Select', isDisabled: false },
  {
    name: 'summary',
    type: 'textarea',
    label: 'Professional Summary',
    placeholder: 'Describe your experience, skills, and what you bring to the table...',
    isDisabled: false,
  },
  {
    name: 'country',
    type: 'select',
    label: 'Country',
    placeholder: 'Select country',
    isDisabled: false,
  },
  { name: 'state', type: 'select', label: 'State', placeholder: 'Select state', isDisabled: false },
  { name: 'city', type: 'select', label: 'City', placeholder: 'Select city', isDisabled: false },
  {
    name: 'linkedinUrl',
    type: 'url',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/yourprofile',
    isDisabled: false,
  },
  {
    name: 'githubUrl',
    type: 'url',
    label: 'GitHub',
    placeholder: 'https://github.com/yourusername',
    isDisabled: false,
  },
  {
    name: 'websiteUrl',
    type: 'url',
    label: 'Portfolio / Website',
    placeholder: 'https://yoursite.com',
    isDisabled: false,
  },
];

// Quick lookup by field name
const fieldMap: Record<string, FieldDef> = Object.fromEntries(fieldDefs.map((f) => [f.name, f]));
