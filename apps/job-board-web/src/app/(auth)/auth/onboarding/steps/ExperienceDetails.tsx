'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import WorkExperienceCard from '@/app/components/cards/WorkExperienceCard';
import ConflictDatesDialog from '@/app/components/dialogs/ConflictDatesDialog';
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
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd, MdOutlineWorkOff } from 'react-icons/md';

const ExperienceDetails = ({
  control,
  errors,
  handleSubmit,
  refetch,
  handleNext,
  handleBack,
  setValue,
  parsedRecords,
  onParsedSaved,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localParsed, setLocalParsed] = useState<any[]>([]);
  const [conflictDialog, setConflictDialog] = useState<any>({ isOpen: false, data: null });

  const { workExperiences, isCurrent, isFresher } = useWatch({ control });

  useEffect(() => {
    if (parsedRecords?.length) {
      setLocalParsed(
        parsedRecords.map((rec: any, i: number) => ({
          ...rec,
          _tempId: `parsed_exp_${i}`,
          _isParsed: true,
        })),
      );
    }
  }, []);

  const allRecords = [...(workExperiences || []), ...localParsed];

  const onEdit = (experience: any) => {
    setEditingId(experience?.id || experience?._tempId);
    setValue?.('title', experience?.title || experience?.jobTitle);
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

  const onSubmit = async (data: any, forceSaveArg: any = false) => {
    const forceSave = forceSaveArg === true;

    const keys = fields?.map((field) => field.name);
    const payload: any = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    const formattedPayload: any = {
      ...payload,
      forceSave,
    };

    for (const key in payload) {
      if (payload[key] !== undefined && payload[key] !== null) {
        if (key === 'startDate' || key === 'endDate') {
          if (key === 'endDate' && payload.isCurrent) {
            formattedPayload[key] = null;
          } else if (payload[key]) {
            formattedPayload[key] = dayjs(payload[key]).format('YYYY-MM-DD');
          } else {
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

      if (editingId?.toString().startsWith('parsed_exp_')) {
        setLocalParsed((prev) =>
          prev.map((rec) => (rec._tempId === editingId ? { ...rec, ...formattedPayload } : rec)),
        );
      } else if (editingId) {
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

  const handleSaveAllParsed = async () => {
    setLoading(true);
    try {
      if (workExperiences?.length > 0) {
        await Promise.all(
          workExperiences.map((rec: any) =>
            http
              .delete(ENDPOINTS.CANDIDATE.DELETE_EXPERIENCE(rec.id))
              .catch((e: unknown) => console.debug('[ExperienceDetails] delete:', e)),
          ),
        );
      }

      for (const rec of localParsed) {
        try {
          await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, {
            title: rec.title,
            designation: rec.designation || rec.title,
            companyName: rec.companyName,
            employmentType: rec.employmentType || 'full_time',
            startDate: rec.startDate || null,
            endDate: rec.isCurrent ? null : rec.endDate || null,
            isCurrent: rec.isCurrent || false,
            location: rec.location || '',
            description: rec.description || '',
            achievements: rec.achievements || '',
            skillsUsed: rec.skillsUsed || '',
          });
        } catch (e: unknown) {
          console.debug('[ExperienceDetails] parsed save error:', e);
        }
      }

      setLocalParsed([]);
      onParsedSaved?.();
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Experience details saved successfully',
      });
    } catch (e) {
      console.debug('[ExperienceDetails] save all error:', e);
    } finally {
      setLoading(false);
    }
    handleNext?.();
  };

  if (loading) return <LoadingProgress />;

  return !showForm && allRecords?.length > 0 ? (
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
        allRecords?.map((record: any) => (
          <div key={record.id || record._tempId}>
            {record._isParsed && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 inline-block">
                From Resume
              </span>
            )}
            <WorkExperienceCard
              key={record.id || record._tempId}
              id={record.id || record._tempId}
              title={record.title}
              designation={record.designation}
              companyName={record.companyName}
              employmentType={record.employmentType}
              location={record.location}
              startDate={record.startDate}
              endDate={record.endDate}
              isCurrent={record.isCurrent}
              description={record.description}
              achievements={record.achievements}
              skillsUsed={record.skillsUsed}
              refetch={refetch}
              onEdit={() => onEdit(record)}
              onDelete={
                record._isParsed
                  ? () => setLocalParsed((prev) => prev.filter((r) => r._tempId !== record._tempId))
                  : undefined
              }
            />
          </div>
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
              fields.forEach((field) => {
                const value = field.type === 'checkbox' ? false : '';
                setValue?.(field.name as any, value);
              });
              setShowForm(true);
            }}
          >
            Add more
          </Button>
          <div className="flex gap-2 mt-2">
            <Button size="md" fullWidth variant="bordered" onPress={handleBack}>
              Back
            </Button>
            <Button
              size="md"
              fullWidth
              color="primary"
              onPress={localParsed.length > 0 ? handleSaveAllParsed : handleNext}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {!workExperiences?.length && localParsed.length === 0 && (
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
              <Button variant="bordered" onPress={handleBack}>
                Back
              </Button>
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

      {conflictDialog.isOpen && (
        <ConflictDatesDialog
          isOpen={conflictDialog.isOpen}
          onSubmit={handleSubmit((data: any) => onSubmit(data, true))}
          message={conflictDialog.data?.message}
          conflicts={conflictDialog.data.conflicts}
          onClose={() => setConflictDialog({ isOpen: false, data: null })}
        />
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
