'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import EducationCard from '@/app/components/cards/EducationCard';
import ConflictDatesDialog from '@/app/components/dialogs/ConflictDatesDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { OnboardingStepProps } from '@/app/types/types';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Input,
  Textarea,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd } from 'react-icons/md';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EducationDetails = ({
  control,
  errors,
  refetch,
  setValue,
  handleSubmit,
  handleNext,
  parsedRecords,
  onParsedSaved,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [localParsed, setLocalParsed] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);
  const [conflictDialog, setConflictDialog] = useState<any>({ isOpen: false, data: null });

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
    setEditingId(education?.id || education?._tempId);
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
      if (value) {
        if (key === 'startDate' || key === 'endDate') {
          if (key === 'endDate' && payload.currentlyStudying) {
            continue;
          } else {
            formattedPayload[key] = dayjs(value).format('YYYY-MM-DD');
          }
        } else if (key === 'currentlyStudying') {
          formattedPayload[key] = Boolean(value);
        } else {
          formattedPayload[key] = value;
        }
      }
    }

    if (editingId && editingId.toString().startsWith('parsed_edu_')) {
      setLocalParsed((prev) =>
        prev.map((rec) => {
          if (rec._tempId === editingId) {
            return {
              ...rec,
              ...formattedPayload,
              _tempId: editingId,
              _isParsed: true,
            };
          }
          return rec;
        }),
      );
      setShowForm(false);
      setEditingId(null);
      setLoading(false);
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Education details updated locally',
      });
      return;
    }

    try {
      setLoading(true);
      let res: any;

      if (editingId) {
        res = await http.put(ENDPOINTS.CANDIDATE.UPDATE_EDUCATION(editingId), formattedPayload);
      } else {
        res = await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, formattedPayload);
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
            startDate: rec.startDate ? dayjs(rec.startDate).format('YYYY-MM-DD') : null,
            endDate: rec.currentlyStudying
              ? null
              : rec.endDate
                ? dayjs(rec.endDate).format('YYYY-MM-DD')
                : null,
            grade: rec.grade || '',
            currentlyStudying: rec.currentlyStudying || false,
            forceSave: true,
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
  };

  if (loading) return <LoadingProgress />;

  const allRecords = [...(educationRecords || []), ...localParsed];

  return (
    <>
      {!showForm && allRecords.length > 0 ? (
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
                    ? () =>
                        setLocalParsed((prev) => prev.filter((r) => r._tempId !== record._tempId))
                    : undefined
                }
              />
            </div>
          ))}

          {!parsedRecords?.length && (
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
          )}
          <div className="flex gap-2 mt-2">
            <Button
              size="md"
              fullWidth
              color="primary"
              onPress={(parsedRecords ?? []).length > 0 ? handleSaveAllParsed : handleNext}
            >
              {parsedRecords?.length ? 'Save' : 'Next'}
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
                    if (field.name === 'endDate' && currentlyStudying) return null as any;

                    const dateValue = inputProps.value
                      ? dayjs(
                          inputProps.value.year
                            ? `${inputProps.value.year}-${inputProps.value.month}-${inputProps.value.day}`
                            : inputProps.value,
                        ).toDate()
                      : null;

                    return (
                      <div className="flex flex-col mb-4">
                        <ReactDatePicker
                          selected={dateValue}
                          onChange={(date: any) => {
                            if (date) {
                              const formatted = dayjs(date).format('YYYY-MM-DD');
                              inputProps.onChange(parseDate(formatted));
                            } else {
                              inputProps.onChange(null);
                            }
                          }}
                          dateFormat="MM/yyyy"
                          showMonthYearPicker
                          maxDate={dayjs().toDate()}
                          customInput={
                            <Input
                              label={field.label}
                              labelPlacement="outside"
                              placeholder={field.placeholder}
                              className="w-full"
                              size="lg"
                              isInvalid={!!fieldError}
                              errorMessage={fieldError?.message as string}
                              autoComplete="off"
                            />
                          }
                          portalId="root-portal"
                          className="w-full"
                          wrapperClassName="w-full"
                        />
                      </div>
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
                          if (val && field.name === 'currentlyStudying') {
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
            {showForm && (
              <Button
                color="default"
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            )}

            <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
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
    </>
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
