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
  DatePicker,
  Input,
  Select,
  SelectItem,
  Slider,
  Switch,
  Textarea,
} from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { getLocalTimeZone, today } from '@internationalized/date';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';

type Props = {
  control: any;
  errors: any;
  onSubmit: any;
  isSubmitting: boolean;
  setValue: any;
};

const JobForm = ({ control, errors, onSubmit, isSubmitting, setValue }: Props) => {
  const { user } = useUserStore();
  const [skillValue, setSkillValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState<IOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<IOption[]>([]);
  const [subCategories, setSubCategories] = useState<IOption[]>([]);
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);

  const canFeaturedJob = (user?.activeSubscription?.featuredJobsLimit ?? 0) > 0;

  const { skills, categoryId, isFeatured } = useWatch({ control });

  const requiredLabel = (label: string) => (
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="text-red-500" aria-hidden="true">
        *
      </span>
    </span>
  );

  const onRemoveSkill = (skill: string) => {
    const updated = skills?.filter((ev: string) => ev !== skill);
    setValue('skills', updated);
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
    if (categoryId) {
      getSubCategories();
    }
  }, [categoryId]);

  useEffect(() => {
    getCategories();
  }, []);

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

  const onSkillSelect = (key: React.Key | null) => {
    if (!key) return;
    const exists = skills?.find((ev: string) => ev === key);
    if (!exists) {
      setValue('skills', [...skills, key]);
      setSkillOptions([]);
    }
  };

  return (
    <Card shadow="none" className="w-full max-w-5xl mx-auto rounded-3xl border border-default-200 bg-background/95 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6 pb-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Job posting</p>
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
                    field.onChange(CommonUtils.toCamelCase(event.target.value));
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
                  const formattedValue = CommonUtils.toCamelCase(value);
                  searchSkills(formattedValue);
                  setSkillValue(formattedValue);
                }}
                isInvalid={!!errors?.skills}
                errorMessage={errors?.skills?.message}
                onSelectionChange={(key) => {
                  if (key) {
                    onSkillSelect(key);
                    setSkillValue('');
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    const value = CommonUtils.toCamelCase(e.target.value);
                    if (value && !skills.includes(value)) {
                      onSkillSelect(value);
                      setSkillValue('');
                    }
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
                {skills.map((s: string) => (
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
                  }}
                >
                  {categories?.map((item: any) => (
                    <AutocompleteItem key={item?.key} textValue={item?.label}>
                      {item?.label}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}
            />

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
                  onSelectionChange={field.onChange}
                >
                  {subCategories?.map((item: any) => (
                    <AutocompleteItem key={item?.key} textValue={item?.label}>
                      {item?.label}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}
            />

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
                  <DatePicker
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
        <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>
          Save & Preview
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobForm;
