'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { ProfileEditProps } from '@/app/types/types';
import {
  addToast,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';
import WorkExperienceCard from '../cards/WorkExperienceCard';
import { employmentTypes } from '@/app/config/data';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import dayjs from 'dayjs';
import ConflictDatesDialog from '../dialogs/ConflictDatesDialog';
import LoadingProgress from '../lib/LoadingProgress';

const ExperienceDetails = ({
  control,
  errors,
  handleSubmit,
  isSubmitting,
  refetch,
  setValue,
}: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflictDialog, setConflictDialog] = useState<any>({ isOpen: false, data: null });

  const { workExperiences, isCurrent } = useWatch({ control });

  const toggleForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      setEditingId(null);
    }
  };

  const onEdit = (experience: any) => {
    setShowForm(true);
    setEditingId(experience?.id);
    setTimeout(() => {
      setValue?.('title', experience?.title || experience?.jobTitle, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('designation', experience?.designation, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('companyName', experience?.companyName, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('employmentType', experience?.employmentType, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('location', experience?.location, { shouldValidate: true, shouldDirty: true });
      setValue?.('isCurrent', experience?.isCurrent ?? false, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('description', experience?.description, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('achievements', experience?.achievements, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('skillsUsed', experience?.skillsUsed, {
        shouldValidate: true,
        shouldDirty: true,
      });

      if (experience?.startDate) {
        setValue?.('startDate', parseDate(dayjs(experience.startDate).format('YYYY-MM-DD')), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      if (experience?.endDate) {
        setValue?.('endDate', parseDate(dayjs(experience.endDate).format('YYYY-MM-DD')), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }, 0);
  };

  const onSubmit = async (data: any, forceSaveArg: any = false) => {
    const forceSave = forceSaveArg === true;

    const keys = fields?.map((field) => field.name);
    const payload: any = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    const formattedPayload: any = {
      forceSave,
    };

    for (const key in payload) {
      const value = payload[key];
      if (value !== undefined && value !== null) {
        if (key === 'startDate' || key === 'endDate') {
          if (value) {
            formattedPayload[key] = dayjs(value).format('YYYY-MM-DD');
          } else if ((key === 'endDate' && payload?.isCurrent) || !value) {
            formattedPayload[key] = null;
          }
        } else if (key === 'isCurrent') {
          formattedPayload[key] = Boolean(payload[key]);
        } else {
          formattedPayload[key] = payload[key];
        }
      }
    }

    try {
      setLoading(true);
      let res: any;

      if (editingId) {
        res = await http.put(ENDPOINTS.CANDIDATE.UPDATE_EXPERIENCE(editingId), formattedPayload);
      } else {
        res = await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, formattedPayload);
      }

      if (res?.data?.conflicts && !forceSave) {
        setConflictDialog({
          isOpen: true,
          data: {
            message: res?.message,
            conflicts: res?.data?.conflicts,
          },
        });
      } else {
        refetch?.();
        addToast({
          color: 'success',
          title: 'Success',
          description: `Experience ${editingId ? 'updated' : 'added'} successfully`,
        });
        setShowForm(false);
        setEditingId(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Experience Details</h1>
      {loading ? (
        <LoadingProgress />
      ) : !showForm ? (
        <div className="grid gap-5">
          {workExperiences?.[0]?.isFresher ? (
            <p className="text-center text-gray-500">No Experience Added Yet!!</p>
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
                isCurrent={record.isCurrent}
                description={record.description}
                achievements={record.achievements}
                skillsUsed={record.skillsUsed}
                onEdit={() => onEdit(record)}
              />
            ))
          )}

          <Button
            size="md"
            fullWidth
            color="default"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={() => {
              setEditingId(null);
              setShowForm(true);
              setTimeout(() => {
                fields.forEach((field) => {
                  const value = field.type === 'checkbox' ? false : '';
                  setValue?.(field.name as any, value);
                });
              }, 0);
            }}
          >
            Add more
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5 sm:grid-cols-2">
            {fields?.map((field) => {
              const fieldError = errors[field.name];

              return (
                <Controller
                  key={field.name}
                  control={control}
                  name={field.name}
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
                          onValueChange={(val) => {
                            inputProps.onChange(val);
                            if (val && field.name === 'isCurrent') {
                              setValue?.('endDate', null as any);
                            }
                          }}
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
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button color="primary" size="md" type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      )}

      {conflictDialog.isOpen && (
        <ConflictDatesDialog
          isOpen={conflictDialog.isOpen}
          onSubmit={handleSubmit((data: any) => onSubmit(data, true))}
          message={conflictDialog.data?.message}
          conflicts={conflictDialog.data.conflicts}
          onClose={() => setConflictDialog({ isOpen: false, data: null })}
        />
      )}
    </div>
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
    name: 'skillsUsed',
    type: 'text',
    label: 'Skills Used',
    placeholder: 'Skills used in this role',
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
    name: 'isCurrent',
    type: 'checkbox',
    label: "I'm currently working here",
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
