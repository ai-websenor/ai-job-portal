import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import {
  ImmigrationStatus,
  JobTypes,
  PayRates,
  ProficiencyLevel,
  WorkModes,
} from '@/app/types/enum';
import { IOption } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
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
  Form,
  Input,
  Select,
  SelectItem,
  Slider,
  Textarea,
} from '@heroui/react';
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
  const [skill, setSkill] = useState<string>('');
  const [categories, setCategories] = useState<IOption[]>([]);
  const [subCategories, setSubCategories] = useState<IOption[]>([]);
  const { skills, salaryMin, salaryMax, country } = useWatch({ control });

  const { cities, countries, getCitiesByState, getStatesByCountry, states } = useCountryStateCity();

  const onRemoveSkill = (skill: string) => {
    const updated = skills?.filter((ev: string) => ev !== skill);
    setValue('skills', updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const trimmedValue = skill.trim();

      if (trimmedValue && !skills?.includes(trimmedValue)) {
        const updatedSkills = [...(skills || []), trimmedValue];
        setValue('skills', updatedSkills);
        setSkill('');
      }
    }
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

  const getSubCategories = async (categoryId: string) => {
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
    getCategories();
  }, []);

  return (
    <Card shadow="none" className="p-5">
      <CardHeader>
        <h1 className="text-2xl font-bold mt-2">Create Job</h1>
      </CardHeader>
      <CardBody>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:max-w-[50%]">
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  autoFocus
                  label="Title"
                  size="lg"
                  isInvalid={!!errors.title}
                  placeholder="Enter job title"
                  labelPlacement="outside"
                  errorMessage={errors.title?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  size="lg"
                  minRows={8}
                  label="Role Description"
                  isInvalid={!!errors.description}
                  placeholder="Enter role description"
                  labelPlacement="outside"
                  errorMessage={errors.description?.message}
                />
              )}
            />

            <div>
              <Input
                size="lg"
                label="Skills"
                labelPlacement="outside"
                placeholder="Type skill and hit enter"
                value={skill}
                onValueChange={setSkill}
                onKeyDown={handleKeyDown}
              />
              <div className="flex flex-wrap gap-3 items-center mt-5">
                {skills?.map((skill: string) => (
                  <Chip key={skill} variant="flat" onClose={() => onRemoveSkill(skill)}>
                    {skill}
                  </Chip>
                ))}
              </div>
            </div>

            <Slider
              defaultValue={[salaryMin, salaryMax]}
              formatOptions={{ style: 'currency', currency: 'INR' }}
              label="Salary"
              maxValue={200000}
              minValue={2000}
              step={5000}
              showTooltip
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Autocomplete
                  label="Category"
                  placeholder="Select Category"
                  labelPlacement="outside"
                  size="lg"
                  selectedKey={field.value}
                  isInvalid={!!errors.categoryId}
                  errorMessage={errors.categoryId?.message}
                  onSelectionChange={(key) => {
                    field.onChange(key);
                    if (key) getSubCategories(key as string);
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
                  label="Sub Category"
                  placeholder="Select Sub Category"
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
              name="country"
              render={({ field }) => (
                <Autocomplete
                  label="Country"
                  placeholder="Select Country"
                  labelPlacement="outside"
                  size="lg"
                  selectedKey={field.value}
                  isInvalid={!!errors.country}
                  errorMessage={errors.country?.message}
                  onSelectionChange={async (value) => {
                    field.onChange(value);
                    await getStatesByCountry(Number(value));
                  }}
                >
                  {countries.map((item) => (
                    <AutocompleteItem key={String(item.value)} textValue={item.label}>
                      {item.label}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}
            />

            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Autocomplete
                  label="State"
                  placeholder="Select State"
                  labelPlacement="outside"
                  size="lg"
                  selectedKey={field.value}
                  isInvalid={!!errors.state}
                  errorMessage={errors.state?.message}
                  onSelectionChange={async (value) => {
                    field.onChange(value);
                    await getCitiesByState(Number(country), Number(value));
                  }}
                >
                  {states.map((item) => (
                    <AutocompleteItem key={String(item.value)} textValue={item.label}>
                      {item.label}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}
            />

            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Autocomplete
                  label="City"
                  placeholder="Select City"
                  labelPlacement="outside"
                  size="lg"
                  selectedKey={field.value}
                  isInvalid={!!errors.city}
                  errorMessage={errors.city?.message}
                  onSelectionChange={async (value) => {
                    field.onChange(value);
                  }}
                >
                  {cities.map((item) => (
                    <AutocompleteItem key={String(item.value)} textValue={item.label}>
                      {item.label}
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
                  label="Minimum Experience"
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
                <DatePicker
                  {...field}
                  label="Application Deadline"
                  labelPlacement="outside"
                  size="lg"
                  minValue={today(getLocalTimeZone()).add({ days: 1 })}
                  isInvalid={!!errors.deadline}
                  errorMessage={errors.deadline?.message}
                  onChange={async (value) => {
                    field.onChange(value);
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="jobType"
              render={({ field }) => (
                <Select
                  label="Job Type"
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
                  label="Work Mode"
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
                  label="Location"
                  placeholder="Enter location"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.location}
                  errorMessage={errors.location?.message}
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
                  value={field?.value}
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
                  label="Qualification"
                  placeholder="Enter qualification"
                  labelPlacement="outside"
                  size="lg"
                  isInvalid={!!errors.qualification}
                  errorMessage={errors.qualification?.message}
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
                />
              )}
            />

            <Controller
              control={control}
              name="payRate"
              render={({ field }) => (
                <Select
                  label="Pay Rate"
                  placeholder="Select pay rate"
                  labelPlacement="outside"
                  size="lg"
                  value={field?.value}
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
      </CardBody>

      <CardFooter className="flex justify-end">
        <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>
          Save & Preview
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobForm;
