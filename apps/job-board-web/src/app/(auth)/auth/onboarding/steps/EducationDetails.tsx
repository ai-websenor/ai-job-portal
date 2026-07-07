'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import EducationCard from '@/app/components/cards/EducationCard';
import ConflictDatesDialog from '@/app/components/dialogs/ConflictDatesDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { OnboardingStepProps } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Input,
  Textarea,
  Tooltip,
} from '@heroui/react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd, MdInfoOutline } from 'react-icons/md';
import RequiredLabel from '@/app/components/form/RequiredLabel';
import AppDatePicker from '@/app/components/lib/AppDatePicker';

const END_DATE_ERROR = 'End date must be after the start date.';
const DEFAULT_GRADE_TYPE = 'cgpa';
const HONORS_MAX_LENGTH = 100;
const gradeTypeOptions = [
  { key: 'cgpa', label: 'CGPA' },
  { key: 'percentage', label: '%' },
];

const toComparableDateString = (value: any) => {
  if (!value) return '';

  if (
    typeof value?.year === 'number' &&
    typeof value?.month === 'number' &&
    typeof value?.day === 'number'
  ) {
    const month = String(value.month).padStart(2, '0');
    const day = String(value.day).padStart(2, '0');

    return `${value.year}-${month}-${day}`;
  }

  return value;
};

const isValidEndDate = (startDate: any, endDate: any) => {
  if (!startDate || !endDate) return true;

  return dayjs(toComparableDateString(endDate)).isAfter(dayjs(toComparableDateString(startDate)), 'day');
};

const renderFieldLabel = (label: string, isRequired?: boolean) => (
  <RequiredLabel isRequired={isRequired}>{label}</RequiredLabel>
);

const getGradePlaceholder = (gradeType?: string) =>
  gradeType === 'percentage' ? 'e.g. 85' : 'e.g. 8.5';

const sanitizeGradeValue = (value: string) => {
  const numericValue = value.replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = numericValue.split('.');
  const decimalPart = decimalParts.join('').slice(0, 2);
  const formattedValue = numericValue.includes('.') ? `${integerPart}.${decimalPart}` : integerPart;

  if (!formattedValue || formattedValue === '.') return formattedValue;

  const numericGrade = Number(formattedValue);
  if (Number.isNaN(numericGrade)) return '';

  return formattedValue;
};

const renderAcademicPerformanceLabel = (isRequired?: boolean) => (
  <span className="inline-flex items-center gap-1.5">
    {renderFieldLabel('Academic Performance', isRequired)}
    <Tooltip content="Select CGPA or percentage for this score." placement="top">
      <span className="inline-flex text-default-500">
        <MdInfoOutline size={18} />
      </span>
    </Tooltip>
  </span>
);

const EducationDetails = ({
  control,
  errors,
  refetch,
  setValue,
  handleSubmit,
  handleNext,
  parsedRecords,
  onParsedSaved,
  handleBack,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [localParsed, setLocalParsed] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);
  const [conflictDialog, setConflictDialog] = useState<any>({ isOpen: false, data: null });
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const {
    educationRecords,
    currentlyStudying,
    startDate,
    endDate,
    gradeType,
  } = useWatch({ control });

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
    if (!gradeType) {
      setValue?.('gradeType', DEFAULT_GRADE_TYPE);
    }
  }, [gradeType, setValue]);

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

  useEffect(() => {
    if (currentlyStudying) {
      setDateRangeError(null);
      return;
    }

    if (startDate && endDate && !isValidEndDate(startDate, endDate)) {
      setDateRangeError(END_DATE_ERROR);
      return;
    }

    setDateRangeError(null);
  }, [currentlyStudying, endDate, startDate]);

  const onEdit = (education: any) => {
    setEditingId(education?.id || education?._tempId);
    setValue?.('degree', education?.degree);
    setValue?.('institution', education?.institution);
    setValue?.('fieldOfStudy', education?.fieldOfStudy);
    setValue?.('grade', education?.grade);
    setValue?.('gradeType', education?.gradeType || DEFAULT_GRADE_TYPE);
    setValue?.('honors', education?.honors);
    setValue?.('description', education?.description);
    setValue?.('currentlyStudying', education?.currentlyStudying ?? false);

    const isOnlyYear = education?.startDate?.length === 4;

    if (!isOnlyYear && education?.startDate) {
      setValue?.('startDate', parseDate(dayjs(education.startDate).format('YYYY-MM-DD')));
    }

    if (education?.endDate || isOnlyYear) {
      setValue?.(
        'endDate',
        parseDate(
          dayjs(isOnlyYear ? education?.startDate : education.endDate).format('YYYY-MM-DD'),
        ),
      );
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

    if (
      !data?.currentlyStudying &&
      data.startDate &&
      data.endDate &&
      !isValidEndDate(data.startDate, data.endDate)
    ) {
      setDateRangeError(END_DATE_ERROR);
      addToast({
        color: 'danger',
        title: 'Invalid date range',
        description: END_DATE_ERROR,
      });
      return;
    }

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
        } else {
          formattedPayload[key] = value;
        }
      }
    }

    formattedPayload.currentlyStudying = Boolean(payload?.currentlyStudying);

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
            gradeType: rec.gradeType || DEFAULT_GRADE_TYPE,
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
                  setValue?.(
                    field.name as any,
                    field.name === 'currentlyStudying'
                      ? false
                      : field.name === 'gradeType'
                        ? DEFAULT_GRADE_TYPE
                        : '',
                  ),
                );
                setShowForm(true);
              }}
            >
              Add more
            </Button>
          )}
          <div className="flex justify-between gap-2 mt-2">
            <Button size="md" fullWidth color="default" onPress={handleBack}>
              Back
            </Button>
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

            if (field.name === 'endDate') return null;
            if (field.name === 'currentlyStudying') return null;
            if (field.name === 'gradeType') return null;

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
                        label={renderFieldLabel(field.label, field.isRequired)}
                        placeholder={field.placeholder}
                        labelPlacement="outside"
                        size="lg"
                        className="mb-4"
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                        allowsCustomValue
                        items={filteredItems}
                        inputValue={inputProps.value || ''}
                        onInputChange={(val) => inputProps.onChange(CommonUtils.toCamelCase(val))}
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
                    // startDate — render both start and end in one 2-column row
                    const renderDatePicker = (
                      fieldDef: (typeof fields)[number],
                      fieldInput: typeof inputProps,
                      fieldErr: any,
                      isDisabled = false,
                    ) => {
                      return (
                        <div className="flex flex-col">
                          <AppDatePicker
                            value={fieldInput.value || null}
                            isDisabled={isDisabled}
                            onChange={(date: any) => {
                              if (date) {
                                const formatted = dayjs(date.toDate(getLocalTimeZone())).format('YYYY-MM-DD');
                                fieldInput.onChange(parseDate(formatted));
                              } else {
                                fieldInput.onChange(null);
                              }
                            }}
                            maxValue={fieldDef.name === 'startDate' ? today(getLocalTimeZone()) : undefined}
                            label={renderFieldLabel(fieldDef.label, fieldDef.isRequired)}
                            labelPlacement="outside"
                            className="w-full"
                            size="lg"
                            isInvalid={!!fieldErr || (fieldDef.name === 'endDate' && !!dateRangeError)}
                            errorMessage={
                              (fieldDef.name === 'endDate' ? dateRangeError : null) ||
                              (fieldErr?.message as string)
                            }
                          />
                        </div>
                      );
                    };

                    return (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Start Date */}
                        {renderDatePicker(field, inputProps, fieldError)}

                        <div className="flex flex-col">
                          <Controller
                            key="endDate"
                            control={control}
                            name={'endDate' as any}
                            render={({ field: endProps }) =>
                              renderDatePicker(
                                fields.find((f) => f.name === 'endDate')!,
                                endProps,
                                errors['endDate'],
                                Boolean(currentlyStudying),
                              )
                            }
                          />
                          <Controller
                            key="currentlyStudying"
                            control={control}
                            name={'currentlyStudying' as any}
                            render={({ field: currentlyStudyingProps }) => (
                              <Checkbox
                                {...currentlyStudyingProps}
                                size="md"
                                className="mt-2"
                                isInvalid={!!errors['currentlyStudying']}
                                isSelected={Boolean(currentlyStudyingProps.value)}
                                onValueChange={(val) => {
                                  currentlyStudyingProps.onChange(val);
                                  if (val) {
                                    setValue?.('endDate', null as any);
                                  }
                                }}
                              >
                                Currently Studying
                              </Checkbox>
                            )}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (field?.type === 'textarea') {
                    return (
                      <Textarea
                        {...inputProps}
                        label={renderFieldLabel(field.label, field.isRequired)}
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

                  if (field.name === 'grade') {
                    const selectedGradeType = gradeType || DEFAULT_GRADE_TYPE;

                    return (
                      <Input
                        {...inputProps}
                        label={renderAcademicPerformanceLabel(field.isRequired)}
                        placeholder={getGradePlaceholder(selectedGradeType)}
                        labelPlacement="outside"
                        size="lg"
                        className="mb-4"
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                        value={inputProps.value || ''}
                        onChange={(event) =>
                          (setValue as any)?.('grade', sanitizeGradeValue(event.target.value), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        endContent={
                          <div className="flex h-10 min-w-[132px] overflow-hidden rounded-xl border border-default-200 bg-white shadow-sm">
                            {gradeTypeOptions.map((option) => {
                              const isSelected = selectedGradeType === option.key;

                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  className={`h-full flex-1 px-4 text-sm font-semibold transition-colors ${
                                    isSelected
                                      ? 'bg-primary text-secondary shadow-[inset_0_0_0_1px_rgba(124,58,237,0.16)]'
                                      : 'bg-white text-default-700'
                                  }`}
                                  onClick={() => {
                                    (setValue as any)?.('gradeType', option.key, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    (setValue as any)?.('grade', sanitizeGradeValue(inputProps.value || ''), {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        }
                      />
                    );
                  }

                  return (
                    <Input
                      {...inputProps}
                      label={renderFieldLabel(field.label, field.isRequired)}
                      placeholder={field.placeholder}
                      labelPlacement="outside"
                      size="lg"
                      className="mb-4"
                      isInvalid={
                        !!fieldError ||
                        (field.name === 'honors' &&
                          (inputProps.value || '').length > HONORS_MAX_LENGTH)
                      }
                      errorMessage={
                        field.name === 'honors' &&
                        (inputProps.value || '').length > HONORS_MAX_LENGTH
                          ? `Honors must be at most ${HONORS_MAX_LENGTH} characters`
                          : fieldError?.message
                      }
                      onChange={(event) => {
                        const shouldFormat =
                          field.type === 'text' &&
                          field.name !== 'grade' &&
                          field.name !== 'institution';
                        const value = event.target.value;

                        inputProps.onChange(
                          shouldFormat
                            ? CommonUtils.toCamelCase(value)
                            : value,
                        );
                      }}
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
              <Button color="default" onPress={handleBack}>
                Back
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
    label: 'Academic Performance',
    placeholder: 'e.g. 8.5',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'gradeType',
    type: 'hidden',
    label: 'Grade Type',
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'honors',
    type: 'text',
    label: 'Honors',
    placeholder: "e.g. Honor Roll, Dean's List",
    maxLength: HONORS_MAX_LENGTH,
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
