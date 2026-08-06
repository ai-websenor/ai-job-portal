import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useUserStore from '@/app/store/useUserStore';
import { ImmigrationStatus, JobTypes, PayRates, WorkModes } from '@/app/types/enum';
import { IOption } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { RichTextEditor } from './RichTextEditor';
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Slider,
  Switch,
  Textarea,
  useDisclosure,
} from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { getLocalTimeZone, today } from '@internationalized/date';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import AppDatePicker from '../lib/AppDatePicker';

type Props = {
  control: any;
  errors: any;
  onSubmit: any;
  isSubmitting: boolean;
  setValue: any;
};

// Sentinel that tells the backend the employer typed a custom Industry/Department
// (find-or-created as a user-typed category). Must match the API's OTHER_CATEGORY_VALUE.
const OTHER_CATEGORY = 'other';

const JobForm = ({ control, errors, onSubmit, isSubmitting, setValue }: Props) => {
  const { user } = useUserStore();
  const [skillValue, setSkillValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState<IOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<IOption[]>([]);
  const [subCategories, setSubCategories] = useState<IOption[]>([]);
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);

  const canFeaturedJob = (user?.activeSubscription?.featuredJobsLimit ?? 0) > 0;

  // Plan validity drives job auto-expiry. Longer validity costs extra posting credits.
  const [planValidityDays, setPlanValidityDays] = useState<number | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const confirmModal = useDisclosure();

  const { skills, categoryId, subCategoryId, isFeatured, validityDays } = useWatch({ control });
  const selectedSkills = Array.isArray(skills) ? skills : [];
  const showSkillsError = selectedSkills.length === 0 && !!errors?.skills;

  // Effective validity defaults to the plan validity when the employer leaves it blank.
  const chosenValidity = Number(validityDays) > 0 ? Number(validityDays) : planValidityDays || 0;
  const creditsNeeded =
    planValidityDays && planValidityDays > 0 && chosenValidity > 0
      ? Math.ceil(chosenValidity / planValidityDays)
      : 1;
  // Days actually covered by the credits charged (e.g. 5 credits × 7 = 35 days).
  const coveredDays =
    planValidityDays && planValidityDays > 0 ? creditsNeeded * planValidityDays : 0;
  const isUnlimitedPlan = !planValidityDays || planValidityDays <= 0;
  const insufficientCredits = remainingCredits != null && creditsNeeded > remainingCredits;

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await http.get(ENDPOINTS.SUBSCRIPTIONS.USAGE);
        const data = res?.data;
        if (data) {
          setPlanValidityDays(data.jobValidityDays ?? null);
          setRemainingCredits(data.usage?.jobPosting?.remaining ?? null);
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchUsage();
  }, []);

  // Show the cost confirmation modal when the chosen validity costs more than one credit.
  const handleSaveClick = () => {
    if (!isUnlimitedPlan && creditsNeeded > 1) {
      confirmModal.onOpen();
      return;
    }
    onSubmit();
  };

  const handleConfirmSave = () => {
    confirmModal.onClose();
    onSubmit();
  };

  const requiredLabel = (label: string) => (
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="text-red-500" aria-hidden="true">
        *
      </span>
    </span>
  );

  const onRemoveSkill = (skill: string) => {
    const updated = selectedSkills.filter((ev: string) => ev !== skill);
    setValue('skills', updated, { shouldValidate: true, shouldDirty: true });
  };

  const getCategories = async () => {
    try {
      const response = await http.get(ENDPOINTS.EMPLOYER.JOBS.CATEGORIES);
      if (response?.data) {
        const temp = response?.data?.map((item: any) => ({ key: item?.id, label: item?.name }));
        setCategories(temp);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getSubCategories = async () => {
    try {
      const response = await http.get(ENDPOINTS.EMPLOYER.JOBS.SUB_CATEGORIES(categoryId));
      if (response?.data) {
        const temp = response?.data?.map((item: any) => ({ key: item?.id, label: item?.name }));
        setSubCategories(temp);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    // No master subcategories to fetch for a custom ("Other") industry.
    if (categoryId && categoryId !== OTHER_CATEGORY) {
      getSubCategories();
    } else {
      setSubCategories([]);
    }
  }, [categoryId]);

  useEffect(() => {
    getCategories();
  }, []);

  useEffect(() => CommonUtils.disableNumberInputWheel(), []);

  const searchSkills = async (query: string) => {
    setIsSearching(true);

    if (debounceTime) {
      clearTimeout(debounceTime);
    }

    setDebounceTime(
      setTimeout(async () => {
        try {
          const response = await http.get(ENDPOINTS.MASTER_DATA.SKILLS, {
            params: { search: query.trim() },
          });
          if (response?.data) {
            const temp = response?.data?.map((item: any) => ({ key: item?.id, label: item?.name }));
            setSkillOptions(temp);
          }
        } catch (error) {
          console.log(error);
        } finally {
          setIsSearching(false);
        }
      }, 1500),
    );
  };

  /**
   * Adds a skill to the job, using the master-list spelling whenever the typed
   * text matches one.
   *
   * Storing the master spelling matters: candidate profiles hold the canonical
   * name ("GitHub", "CSS", "PHP"), and job matching compares the two as exact
   * strings. A job saved as "Github" or "Css" matches nobody.
   */
  const onSkillSelect = (key: React.Key | null) => {
    if (!key) return;

    const typed = String(key).replace(/\s+/g, ' ').trim();
    if (!typed) return;

    // Prefer the master-list spelling over whatever case the employer typed.
    const canonical =
      skillOptions.find((option) => option.label?.toLowerCase() === typed.toLowerCase())?.label ??
      typed;

    const exists = selectedSkills.some(
      (ev: string) => ev.toLowerCase() === canonical.toLowerCase(),
    );
    if (!exists) {
      setValue('skills', [...selectedSkills, canonical], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSkillOptions([]);
    }
  };

  return (
    <Card
      shadow="none"
      className="w-full max-w-5xl mx-auto rounded-3xl border border-default-200 bg-background/95 shadow-sm"
    >
      <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Job posting
        </p>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Create Job</h1>
          <p className="text-sm text-default-500">
            Organize the role details, compensation, and visibility settings in one place.
          </p>
        </div>
      </CardHeader>

      <CardBody className="px-6 py-6">
        <div className="grid gap-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Controller
              name="clientName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Client Name"
                  size="lg"
                  className="lg:col-span-2"
                  isInvalid={!!errors.clientName}
                  placeholder="Enter client name"
                  labelPlacement="outside"
                  errorMessage={errors.clientName?.message}
                  onChange={(event) => {
                    field.onChange(CommonUtils.toCamelCase(event.target.value));
                  }}
                />
              )}
            />

            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  autoFocus
                  label={requiredLabel('Title')}
                  size="lg"
                  className="lg:col-span-2"
                  isInvalid={!!errors.title}
                  placeholder="Enter job title"
                  labelPlacement="outside"
                  errorMessage={errors.title?.message}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                  }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  label={requiredLabel('Role Description')}
                  className="lg:col-span-2"
                  isInvalid={!!errors.description}
                  placeholder="Enter role description"
                  errorMessage={errors.description?.message}
                />
              )}
            />
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Autocomplete
                label={requiredLabel('Skills')}
                items={skillOptions}
                isLoading={isSearching}
                labelPlacement="outside"
                placeholder="Search for a skill (e.g. React, PhP)"
                allowsCustomValue
                size="lg"
                inputValue={skillValue}
                onInputChange={(value) => {
                  // Keep what the employer typed. Title-casing here corrupted
                  // acronyms on the way in — "PHP" became "Php", "CSS" became
                  // "Css", "CI/CD" became "Ci/Cd" — none of which match the
                  // canonical name stored on candidate profiles.
                  searchSkills(value);
                  setSkillValue(value);
                }}
                isInvalid={showSkillsError}
                errorMessage={showSkillsError ? errors?.skills?.message : undefined}
                onSelectionChange={(key) => {
                  if (!key) return;
                  // Only accept picks from the dropdown. With allowsCustomValue
                  // this also fires with whatever is in the box, which committed
                  // half-typed text ("Flut", "Ph", "Hub") as real skills.
                  // Free text is added deliberately via Enter instead.
                  const isFromOptions = skillOptions.some((option) => option.label === key);
                  if (!isFromOptions) return;

                  onSkillSelect(key);
                  setSkillValue('');
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSkillSelect(e.target.value);
                    setSkillValue('');
                  }
                }}
              >
                {(item) => (
                  <AutocompleteItem key={item.label} textValue={item.label}>
                    {item.label}
                  </AutocompleteItem>
                )}
              </Autocomplete>

              <div className="flex min-h-10 flex-wrap gap-2 rounded-2xl border border-dashed border-default-200 bg-default-50 px-3 py-2">
                {selectedSkills.map((s: string) => (
                  <Chip key={s} variant="flat" onClose={() => onRemoveSkill(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:col-span-2 lg:grid-cols-2">
              <Controller
                control={control}
                name="salaryRange"
                render={({ field }) => (
                  <Slider
                    {...field}
                    label="Salary"
                    maxValue={200000}
                    minValue={2000}
                    step={5000}
                    showTooltip
                    formatOptions={{ style: 'currency', currency: 'INR' }}
                    value={field.value || [2000, 200000]}
                    onChange={(value: number | number[]) => {
                      if (Array.isArray(value)) {
                        field.onChange(value);
                        setValue('salaryMin', value[0]);
                        setValue('salaryMax', value[1]);
                      }
                    }}
                  />
                )}
              />

              <Controller
                control={control}
                name="payRate"
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Pay Type"
                    placeholder="Select pay rate"
                    labelPlacement="outside"
                    size="lg"
                    selectedKeys={field.value ? new Set([field.value]) : new Set()}
                    onSelectionChange={(v) => field.onChange(v)}
                    isInvalid={!!errors?.payRate}
                    errorMessage={errors?.payRate?.message}
                  >
                    {Object.values(PayRates).map((val) => (
                      <SelectItem key={val}>{CommonUtils.keyIntoTitle(val)}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Autocomplete
                    label={requiredLabel('Industry')}
                    placeholder="Select Industry"
                    labelPlacement="outside"
                    size="lg"
                    selectedKey={field.value}
                    isInvalid={!!errors.categoryId}
                    errorMessage={errors.categoryId?.message}
                    onSelectionChange={(key) => {
                      field.onChange(key);
                      // Switching industry invalidates any previously chosen department.
                      setValue('subCategoryId', '', { shouldValidate: false });
                      setValue('customSubCategory', '', { shouldValidate: false });
                      if (key !== OTHER_CATEGORY) {
                        setValue('customCategory', '', { shouldValidate: false });
                      }
                    }}
                  >
                    {[...(categories ?? []), { key: OTHER_CATEGORY, label: 'Other (add new)' }].map(
                      (item: any) => (
                        <AutocompleteItem key={item?.key} textValue={item?.label}>
                          {item?.label}
                        </AutocompleteItem>
                      ),
                    )}
                  </Autocomplete>
                )}
              />
              {categoryId === OTHER_CATEGORY && (
                <Controller
                  control={control}
                  name="customCategory"
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      label={requiredLabel('New Industry name')}
                      placeholder="Type the industry"
                      labelPlacement="outside"
                      size="lg"
                      isInvalid={!!errors.customCategory}
                      errorMessage={errors.customCategory?.message}
                    />
                  )}
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Controller
                control={control}
                name="subCategoryId"
                render={({ field }) => (
                  <Autocomplete
                    label={requiredLabel('Department')}
                    placeholder="Select Department"
                    labelPlacement="outside"
                    size="lg"
                    selectedKey={field.value}
                    isInvalid={!!errors.subCategoryId}
                    errorMessage={errors.subCategoryId?.message}
                    onSelectionChange={(key) => {
                      field.onChange(key);
                      if (key !== OTHER_CATEGORY) {
                        setValue('customSubCategory', '', { shouldValidate: false });
                      }
                    }}
                  >
                    {[
                      ...(subCategories ?? []),
                      { key: OTHER_CATEGORY, label: 'Other (add new)' },
                    ].map((item: any) => (
                      <AutocompleteItem key={item?.key} textValue={item?.label}>
                        {item?.label}
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>
                )}
              />
              {subCategoryId === OTHER_CATEGORY && (
                <Controller
                  control={control}
                  name="customSubCategory"
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      label={requiredLabel('New Department name')}
                      placeholder="Type the department"
                      labelPlacement="outside"
                      size="lg"
                      isInvalid={!!errors.customSubCategory}
                      errorMessage={errors.customSubCategory?.message}
                    />
                  )}
                />
              )}
            </div>

            <Controller
              control={control}
              name="experienceMin"
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  label={requiredLabel('Minimum Experience')}
                  placeholder="Enter minimum experience"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.experienceMin}
                  errorMessage={errors.experienceMin?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="experienceMax"
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  label="Maximum Experience"
                  placeholder="Enter maximum experience"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.experienceMax}
                  errorMessage={errors.experienceMax?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="deadline"
              render={({ field }) => (
                <I18nProvider locale="en-GB">
                  <AppDatePicker
                    {...field}
                    label={requiredLabel('Application Deadline')}
                    labelPlacement="outside"
                    size="lg"
                    hideTimeZone
                    showMonthAndYearPickers
                    minValue={today(getLocalTimeZone()).add({ days: 1 })}
                    isInvalid={!!errors.deadline}
                    errorMessage={errors.deadline?.message}
                    onChange={async (value) => {
                      field.onChange(value);
                    }}
                  />
                </I18nProvider>
              )}
            />

            {!isUnlimitedPlan && (
              <Controller
                control={control}
                name="validityDays"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      label="Job Validity (days)"
                      placeholder={`Default: ${planValidityDays} days`}
                      labelPlacement="outside"
                      size="lg"
                      value={field.value ?? ''}
                      isInvalid={!!errors.validityDays}
                      errorMessage={errors.validityDays?.message}
                    />
                    <p className="text-xs text-default-500">
                      {Number(validityDays) > 0
                        ? `Costs ${creditsNeeded} posting credit${creditsNeeded > 1 ? 's' : ''} · covers up to ${coveredDays} days`
                        : `Leave blank to use the plan default (${planValidityDays} days, 1 credit).`}
                    </p>
                  </div>
                )}
              />
            )}

            <Controller
              control={control}
              name="jobType"
              render={({ field }) => (
                <Select
                  label={requiredLabel('Job Type')}
                  selectionMode="multiple"
                  labelPlacement="outside"
                  size="lg"
                  selectedKeys={new Set(field.value || [])}
                  onSelectionChange={(keys) => field.onChange(Array.from(keys))}
                  isInvalid={!!errors?.jobType}
                  errorMessage={errors?.jobType?.message}
                >
                  {Object.values(JobTypes).map((val) => (
                    <SelectItem key={val}>{CommonUtils.keyIntoTitle(val)}</SelectItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              control={control}
              name="workMode"
              render={({ field }) => (
                <Select
                  label={requiredLabel('Work Mode')}
                  selectionMode="multiple"
                  labelPlacement="outside"
                  size="lg"
                  selectedKeys={new Set(field.value || [])}
                  onSelectionChange={(keys) => field.onChange(Array.from(keys))}
                  isInvalid={!!errors?.workMode}
                  errorMessage={errors?.workMode?.message}
                >
                  {Object.values(WorkModes).map((val) => (
                    <SelectItem key={val}>{CommonUtils.keyIntoTitle(val)}</SelectItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Input
                  {...field}
                  label={requiredLabel('Location')}
                  placeholder="Enter location"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.location}
                  errorMessage={errors.location?.message}
                  onChange={(event) => {
                    field.onChange(CommonUtils.toCamelCase(event.target.value));
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="immigrationStatus"
              render={({ field }) => (
                <Select
                  {...field}
                  label={'Immigration Status'}
                  placeholder={'Select immigration status'}
                  labelPlacement="outside"
                  size="lg"
                  selectedKeys={field.value ? new Set([field.value]) : new Set()}
                  onSelectionChange={(v) => field.onChange(v)}
                  isInvalid={!!errors?.immigrationStatus}
                  errorMessage={errors?.immigrationStatus?.message}
                >
                  {Object.values(ImmigrationStatus).map((val) => (
                    <SelectItem key={val}>{CommonUtils.keyIntoTitle(val)}</SelectItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              control={control}
              name="qualification"
              render={({ field }) => (
                <Input
                  {...field}
                  label={requiredLabel('Qualification')}
                  placeholder="Enter qualification"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.qualification}
                  errorMessage={errors.qualification?.message}
                  onChange={(event) => {
                    field.onChange(CommonUtils.toCamelCase(event.target.value));
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="certification"
              render={({ field }) => (
                <Input
                  {...field}
                  label="Certification"
                  placeholder="Enter certification"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.certification}
                  errorMessage={errors.certification?.message}
                  onChange={(event) => {
                    field.onChange(CommonUtils.toCamelCase(event.target.value));
                  }}
                />
              )}
            />

            {canFeaturedJob && (
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Featured Job</p>
                    <Switch isSelected={field.value} onValueChange={field.onChange}>
                      Feature this job listing
                    </Switch>
                  </div>
                )}
              />
            )}
          </div>

          <div className="grid gap-5">
            <Controller
              name="benefits"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  size="lg"
                  minRows={8}
                  label="Benefits"
                  className="lg:col-span-2"
                  isInvalid={!!errors.benefits}
                  placeholder="Enter benefits"
                  labelPlacement="outside"
                  errorMessage={errors.benefits?.message}
                />
              )}
            />
          </div>
        </div>

        {isFeatured && (
          <div className="mt-4 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-400">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary-900">
                    Make your job stand out and reach more candidates.
                  </h4>
                  <p className="text-xs text-default-600 mt-1 leading-relaxed">
                    Featured jobs get{' '}
                    <span className="font-bold text-primary-600">20%+ higher visibility</span> in
                    search results and appear in top positions, helping you attract more applicants
                    faster.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 mt-2 ml-1">
                {[
                  'Displayed at the top of job listings',
                  'Highlighted with a special badge',
                  'Higher chances of receiving quality applications',
                ].map((text, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-success text-xs font-bold">✔</span>
                    </div>
                    <span className="text-xs text-default-700 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter className="flex justify-end px-6 pb-6 pt-0">
        <Button color="primary" onPress={handleSaveClick} isLoading={isSubmitting}>
          Save & Preview
        </Button>
      </CardFooter>

      {/* Validity credit-cost confirmation */}
      <Modal isOpen={confirmModal.isOpen} onOpenChange={confirmModal.onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Confirm job validity cost</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  Your plan gives each job posting credit{' '}
                  <span className="font-semibold">{planValidityDays} days</span> of live time. You
                  asked for a longer validity, so extra credits will be used when this job is
                  published.
                </p>

                <div className="mt-2 rounded-2xl border border-default-200 bg-default-50 p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-default-500">Validity you requested</span>
                    <span className="font-medium">{chosenValidity} days</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-default-500">Per-credit validity</span>
                    <span className="font-medium">{planValidityDays} days</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-default-500">Calculation</span>
                    <span className="font-medium">
                      ⌈ {chosenValidity} ÷ {planValidityDays} ⌉ = {creditsNeeded} credits
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-default-200 mt-1 pt-2">
                    <span className="text-default-500">Credits charged</span>
                    <span className="font-semibold text-primary-600">{creditsNeeded}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-default-500">Coverage for those credits</span>
                    <span className="font-medium">up to {coveredDays} days</span>
                  </div>
                  {remainingCredits != null && (
                    <div className="flex justify-between py-1">
                      <span className="text-default-500">Credits remaining</span>
                      <span className="font-medium">{remainingCredits}</span>
                    </div>
                  )}
                </div>

                {coveredDays > chosenValidity && (
                  <p className="mt-2 text-xs text-default-500">
                    Tip: {creditsNeeded} credits already cover {coveredDays} days. You can set the
                    validity up to {coveredDays} days for the same cost.
                  </p>
                )}

                {insufficientCredits && (
                  <p className="mt-2 text-sm font-medium text-danger">
                    You only have {remainingCredits} credit{remainingCredits === 1 ? '' : 's'} left.
                    Reduce the validity or upgrade your plan.
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmSave}
                  isDisabled={insufficientCredits}
                  isLoading={isSubmitting}
                >
                  Confirm &amp; Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default JobForm;
