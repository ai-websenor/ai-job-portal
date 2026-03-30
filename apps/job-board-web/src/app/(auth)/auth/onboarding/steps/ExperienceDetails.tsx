'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import WorkExperienceCard from '@/app/components/cards/WorkExperienceCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { employmentTypes } from '@/app/config/data';
import { OnboardingStepProps } from '@/app/types/types';
import {
  addToast,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from '@heroui/react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd, MdOutlineWorkOff } from 'react-icons/md';

const ExperienceDetails = ({
  control,
  errors,
  handleSubmit,
  refetch,
  handleNext,
  setValue,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { workExperiences, isCurrent, isFresher } = useWatch({ control });

  const onEdit = (experience: any) => {
    setEditingId(experience?.id);
    setValue?.('title', experience?.jobTitle);
    setValue?.('designation', experience?.designation);
    setValue?.('companyName', experience?.companyName);
    setValue?.('employmentType', experience?.employmentType);
    setValue?.('location', experience?.location);
    setValue?.('isCurrent', experience?.isCurrent ?? false);
    setValue?.('description', experience?.description);
    setValue?.('achievements', experience?.achievements);
    setValue?.('skillsUsed', experience?.skillsUsed);

    if (experience?.startDate) {
      setValue?.('startDate', parseDate(dayjs(experience.startDate).format('YYYY-MM-DD')));
    }

    if (experience?.endDate) {
      setValue?.('endDate', parseDate(dayjs(experience.endDate).format('YYYY-MM-DD')));
    }

    setShowForm(true);
  };

  const handleIsFresher = async (checked: boolean) => {
    setValue?.('isFresher', checked);

    if (!checked) return;

    const payload: Record<string, string | boolean> = {};

    payload.isFresher = checked;

    for (const field of fields) {
      payload[field.name] = '';
    }

    delete payload.startDate;
    delete payload.endDate;
    delete payload.employmentType;
    delete payload.isCurrent;

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, payload);
      refetch?.();
      handleNext?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFresherExperience = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_EXPERIENCE(workExperiences?.[0]?.id));
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);
    const payload: any = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    const formattedPayload: any = {};

    for (const key in payload) {
      if (payload[key]) {
        if (key === 'startDate' || key === 'endDate') {
          formattedPayload[key] = dayjs(payload[key]).format('YYYY-MM-DD');
        } else if (key === 'isCurrent') {
          formattedPayload[key] = Boolean(payload[key]);
        } else {
          formattedPayload[key] = payload[key];
        }
      }
    }

    try {
      setLoading(true);
      if (editingId) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_EXPERIENCE(editingId), formattedPayload);
      } else {
        await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, formattedPayload);
      }
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: `Experience ${editingId ? 'updated' : 'added'} successfully`,
      });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return !showForm && workExperiences?.length > 0 ? (
    <div className="flex flex-col gap-3">
      {workExperiences?.[0]?.isFresher ? (
        <div className="flex items-center gap-2 justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-500">
            <MdOutlineWorkOff size={17} />
            <p className="font-semibold">I'm Fresher</p>
          </div>
          <Switch defaultSelected onChange={deleteFresherExperience} />
        </div>
      ) : (
        workExperiences?.map((record: any) => (
          <WorkExperienceCard
            key={record.id}
            id={record.id}
            refetch={refetch}
            companyName={record.companyName}
            title={record.title}
            startDate={record.startDate}
            endDate={record.endDate}
            description={record.description}
            onEdit={() => onEdit(record)}
          />
        ))
      )}

      {!workExperiences?.[0]?.isFresher && (
        <>
          <Button
            size="md"
            fullWidth
            color="default"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={() => {
              setEditingId(null);
              fields.forEach((field) => setValue?.(field.name as any, ''));
              setShowForm(true);
            }}
          >
            Add more
          </Button>
          <Button size="md" fullWidth color="primary" className="mt-2" onPress={handleNext}>
            Next
          </Button>
        </>
      )}
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {!workExperiences?.length && (
        <div className="flex items-center gap-2 justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-500">
            <MdOutlineWorkOff size={17} />
            <p className="font-semibold">I'm Fresher</p>
          </div>
          <Switch
            checked={Boolean(isFresher)}
            onChange={(ev) => handleIsFresher(ev.target.checked)}
          />
        </div>
      )}

      {!isFresher && (
        <>
          {fields?.map((field) => {
            const fieldError = errors[field.name];

            return (
              <Controller
                key={field.name}
                control={control}
                name={field.name as any}
                render={({ field: inputProps }) => {
                  if (field?.type === 'select') {
                    const optionsMap: Record<string, any[]> = {
                      employmentType: employmentTypes,
                    };

                    return (
                      <Select
                        {...inputProps}
                        label={field.label}
                        placeholder={field.placeholder}
                        labelPlacement="outside"
                        size="lg"
                        className="mb-4"
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                        selectedKeys={inputProps.value ? [inputProps.value] : []}
                      >
                        {optionsMap[field.name]?.map((option: any) => (
                          <SelectItem key={option?.key}>{option?.label}</SelectItem>
                        ))}
                      </Select>
                    );
                  }

                  if (field?.type === 'date') {
                    const dateValue = inputProps.value === '' ? null : inputProps.value;

                    if (field.name === 'endDate' && isCurrent) return null as any;

                    return (
                      <DatePicker
                        {...inputProps}
                        value={dateValue}
                        label={field.label}
                        size="md"
                        className="mb-4"
                        showMonthAndYearPickers
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                        maxValue={today(getLocalTimeZone())}
                      />
                    );
                  }

                  if (field?.type === 'textarea') {
                    return (
                      <Textarea
                        {...inputProps}
                        label={field.label}
                        placeholder={field.placeholder}
                        labelPlacement="outside"
                        size="lg"
                        minRows={6}
                        className="mb-4"
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                      />
                    );
                  }

                  if (field?.type === 'checkbox') {
                    return (
                      <Checkbox
                        {...inputProps}
                        placeholder={field.placeholder}
                        size="md"
                        className="mb-4"
                        isInvalid={!!fieldError}
                        isSelected={inputProps.value}
                      >
                        {field?.label}
                      </Checkbox>
                    );
                  }

                  return (
                    <Input
                      {...inputProps}
                      type={field.type}
                      label={field.label}
                      placeholder={field.placeholder}
                      labelPlacement="outside"
                      size="lg"
                      className="mb-4"
                      isInvalid={!!fieldError}
                      errorMessage={fieldError?.message}
                    />
                  );
                }}
              />
            );
          })}

          <div className="mt-2 flex justify-between">
            {showForm ? (
              <Button
                color="default"
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            ) : (
              <div />
            )}

            <Button
              isLoading={loading}
              endContent={<IoMdArrowForward size={18} />}
              color="primary"
              type="submit"
            >
              Save
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default ExperienceDetails;

const fields = [
  {
    name: 'title',
    type: 'text',
    label: 'Job Title',
    placeholder: 'Enter job title',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'designation',
    type: 'text',
    label: 'Designation',
    placeholder: 'Ex: Lead Developer',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'companyName',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Ex: Google',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'employmentType',
    type: 'select',
    label: 'Employment Type',
    placeholder: 'Ex: Full-time',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'location',
    type: 'text',
    label: 'Location',
    placeholder: 'Ex: San Francisco, CA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'isCurrent',
    type: 'checkbox',
    label: "I'm currently working here",
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Describe your role & achievements',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'achievements',
    type: 'textarea',
    label: 'Achievements',
    placeholder: 'Key projects or achievements',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'skillsUsed',
    type: 'text',
    label: 'Skills Used',
    placeholder: 'Skills used in this role',
    isDisabled: false,
    isRequired: false,
  },
];
