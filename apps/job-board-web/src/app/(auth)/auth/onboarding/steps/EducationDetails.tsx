'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import EducationCard from '@/app/components/cards/EducationCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { OnboardingStepProps } from '@/app/types/types';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Textarea,
} from '@heroui/react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd } from 'react-icons/md';

const EducationDetails = ({
  control,
  errors,
  refetch,
  setValue,
  handleSubmit,
  handleNext,
  handleBack,
  parsedRecords,
  onParsedSaved,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [degrees, setDegrees] = useState<any>([]);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);
  const [localParsed, setLocalParsed] = useState<any[]>([]);

  const { educationRecords, currentlyStudying } = useWatch({ control });

  const getDegrees = async () => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.DEGRESS);
      if (response?.data?.length > 0) {
        setDegrees(
          response?.data?.map((degree: any) => ({
            id: degree?.id,
            label: degree?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldsOfStudies = async (degreeId: string) => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.FIELDS_OF_STUDY(degreeId));
      if (response?.data?.length > 0) {
        setFieldsOfStudies(
          response?.data?.map((study: any) => ({
            id: study?.id,
            label: study?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getDegrees();
  }, []);

  useEffect(() => {
    if (parsedRecords?.length) {
      setLocalParsed(
        parsedRecords.map((rec: any, i: number) => ({
          ...rec,
          _tempId: `parsed_edu_${i}`,
          _isParsed: true,
        })),
      );
    }
  }, []);

  const onEdit = (education: any) => {
    setEditingId(education?.id);
    setValue?.('degree', education?.degree);
    setValue?.('institution', education?.institution);
    setValue?.('fieldOfStudy', education?.fieldOfStudy);
    setValue?.('grade', education?.grade);
    setValue?.('honors', education?.honors);
    setValue?.('description', education?.description);
    setValue?.('currentlyStudying', education?.currentlyStudying ?? false);

    if (education?.startDate) {
      setValue?.('startDate', parseDate(dayjs(education.startDate).format('YYYY-MM-DD')));
    }

    if (education?.endDate) {
      setValue?.('endDate', parseDate(dayjs(education.endDate).format('YYYY-MM-DD')));
    }

    if (education?.degree) {
      const selectedDegree = degrees.find((d: any) => d.label === education.degree);
      if (selectedDegree) {
        getFieldsOfStudies(selectedDegree.id);
      }
    }

    setShowForm(true);
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
        } else if (key === 'currentlyStudying') {
          formattedPayload[key] = Boolean(payload[key]);
        } else {
          formattedPayload[key] = payload[key];
        }
      }
    }

    try {
      setLoading(true);
      if (editingId) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_EDUCATION(editingId), formattedPayload);
      } else {
        await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, formattedPayload);
      }
      refetch?.();

      if (!editingId) {
        handleNext?.();
      }

      addToast({
        color: 'success',
        title: 'Success',
        description: `Education details ${editingId ? 'updated' : 'added'} successfully`,
      });

      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllParsed = async () => {
    setLoading(true);
    try {
      if (educationRecords?.length > 0) {
        await Promise.all(
          educationRecords.map((rec: any) =>
            http
              .delete(ENDPOINTS.CANDIDATE.DELETE_EDUCATION(rec.id))
              .catch((e: unknown) => console.debug('[EducationDetails] delete:', e)),
          ),
        );
      }

      for (const rec of localParsed) {
        try {
          await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, {
            degree: rec.degree,
            institution: rec.institution,
            fieldOfStudy: rec.fieldOfStudy || '',
            startDate: rec.startDate || null,
            endDate: rec.endDate || null,
            grade: rec.grade || '',
            currentlyStudying: rec.currentlyStudying || false,
          });
        } catch (e: unknown) {
          console.debug('[EducationDetails] parsed save error:', e);
        }
      }

      setLocalParsed([]);
      onParsedSaved?.();
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Education details saved successfully',
      });
    } catch (e) {
      console.debug('[EducationDetails] save all error:', e);
    } finally {
      setLoading(false);
    }
    handleNext?.();
  };

  if (loading) return <LoadingProgress />;

  const allRecords = [...(educationRecords || []), ...localParsed];

  return !showForm && allRecords.length > 0 ? (
    <div className="flex flex-col gap-2">
      {allRecords.map((record: any) => (
        <div key={record.id || record._tempId}>
          {record._isParsed && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 inline-block">
              From Resume
            </span>
          )}
          <EducationCard
            key={record.id || record._tempId}
            education={record}
            refetch={refetch}
            onEdit={onEdit}
            onDelete={
              record._isParsed
                ? () => setLocalParsed((prev) => prev.filter((r) => r._tempId !== record._tempId))
                : undefined
            }
          />
        </div>
      ))}

      <Button
        size="md"
        fullWidth
        color="default"
        className="mt-3"
        startContent={<MdAdd />}
        onPress={() => {
          setEditingId(null);
          fields.forEach((field) =>
            setValue?.(field.name as any, field.name === 'currentlyStudying' ? false : ''),
          );
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
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field) => {
        const fieldError = errors[field.name];

        return (
          <Controller
            key={field?.name}
            control={control}
            name={field.name as any}
            render={({ field: inputProps }) => {
              if (
                field?.type === 'select' &&
                (field?.name === 'degree' || field.name == 'fieldOfStudy')
              ) {
                const optionsMap: Record<string, any[]> = {
                  degree: degrees,
                  fieldOfStudy: fieldsOfStudies,
                };

                const rawItems = optionsMap[field.name] || [];
                const searchTerm = (inputProps.value || '').toLowerCase();

                const filteredItems = rawItems.filter((item: any) =>
                  item.label.toLowerCase().includes(searchTerm),
                );

                return (
                  <Autocomplete
                    {...inputProps}
                    label={field.label}
                    placeholder={field.placeholder}
                    labelPlacement="outside"
                    size="lg"
                    className="mb-4"
                    isInvalid={!!fieldError}
                    errorMessage={fieldError?.message}
                    allowsCustomValue
                    items={filteredItems}
                    inputValue={inputProps.value || ''}
                    onInputChange={(val) => inputProps.onChange(val)}
                    onSelectionChange={(key) => {
                      if (key) {
                        inputProps.onChange(key);

                        if (field.name === 'degree') {
                          const selected = degrees.find((d: any) => d.label === key);
                          if (selected) {
                            getFieldsOfStudies(selected.id);
                          }
                        }
                      }
                    }}
                  >
                    {(item: any) => (
                      <AutocompleteItem key={item.label} textValue={item.label}>
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                );
              }

              if (field?.type === 'date') {
                const dateValue = inputProps.value === '' ? null : inputProps.value;

                if (field.name === 'endDate' && currentlyStudying) return null as any;

                return (
                  <DatePicker
                    {...inputProps}
                    label={field.label}
                    size="md"
                    className="mb-4"
                    value={dateValue}
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

        <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
};

export default EducationDetails;

const fields = [
  {
    name: 'degree',
    type: 'select',
    label: 'Degree',
    placeholder: 'Example degree',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'institution',
    type: 'text',
    label: 'Institution Name',
    placeholder: 'Enter institution name',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'fieldOfStudy',
    type: 'select',
    label: 'Field of Study',
    placeholder: 'Enter field of study',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: 'Enter start date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: 'Enter end date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'grade',
    type: 'text',
    label: 'Grade',
    placeholder: 'e.g. A, 3.8 GPA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'honors',
    type: 'text',
    label: 'Honors',
    placeholder: "e.g. Honor Roll, Dean's List",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Additional details about your education',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'currentlyStudying',
    type: 'checkbox',
    label: 'Currently Studying',
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
