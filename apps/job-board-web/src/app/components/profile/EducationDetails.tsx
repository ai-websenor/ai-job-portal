'use client';

import { ProfileEditProps } from '@/app/types/types';
import { Controller, useWatch } from 'react-hook-form';
import EducationCard from '../cards/EducationCard';
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
import { useEffect, useState } from 'react';
import { MdAdd, MdInfoOutline } from 'react-icons/md';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import dayjs from 'dayjs';
import LoadingProgress from '../lib/LoadingProgress';
import { parseDate } from '@internationalized/date';
import ConflictDatesDialog from '../dialogs/ConflictDatesDialog';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import CommonUtils from '@/app/utils/commonUtils';
import RequiredLabel from '@/app/components/form/RequiredLabel';

const DEFAULT_GRADE_TYPE = 'cgpa';
const gradeTypeOptions = [
  { key: 'cgpa', label: 'CGPA' },
  { key: 'percentage', label: '%' },
];

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

const renderFieldLabel = (label: string, isRequired?: boolean) => (
  <RequiredLabel isRequired={isRequired}>{label}</RequiredLabel>
);

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
  errors,
  control,
  refetch,
  isSubmitting,
  handleSubmit,
  setValue,
}: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflictDialog, setConflictDialog] = useState<any>({ isOpen: false, data: null });
  const [gradeValuesByType, setGradeValuesByType] = useState<Record<string, string>>({
    cgpa: '',
    percentage: '',
  });

  const { educationRecords, currentlyStudying, gradeType } = useWatch({ control });

  const toggleForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      setEditingId(null);
    }
  };

  const onEdit = (education: any) => {
    const educationGradeType = education?.gradeType || DEFAULT_GRADE_TYPE;
    const educationGrade = education?.grade || '';

    setShowForm(true);
    setEditingId(education?.id);
    setGradeValuesByType({
      cgpa: educationGradeType === 'cgpa' ? educationGrade : '',
      percentage: educationGradeType === 'percentage' ? educationGrade : '',
    });
    setTimeout(() => {
      setValue?.('degree', education?.degree, { shouldValidate: true, shouldDirty: true });
      setValue?.('institution', education?.institution, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('fieldOfStudy', education?.fieldOfStudy, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('gradeType', educationGradeType, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('grade', educationGrade, { shouldValidate: true, shouldDirty: true });
      setValue?.('honors', education?.honors || '', { shouldValidate: true, shouldDirty: true });
      setValue?.('description', education?.description || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('currentlyStudying', education?.currentlyStudying ?? false, {
        shouldValidate: true,
        shouldDirty: true,
      });

      if (education?.startDate) {
        setValue?.('startDate', parseDate(dayjs(education.startDate).format('YYYY-MM-DD')), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      if (education?.endDate) {
        setValue?.('endDate', parseDate(dayjs(education.endDate).format('YYYY-MM-DD')), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      if (education?.degree) {
        const selectedDegree = degrees.find((d: any) => d.label === education.degree);
        if (selectedDegree) {
          getFieldsOfStudies(selectedDegree.id);
        }
      }
    }, 0);
  };

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
          if (key === 'endDate' && data.currentlyStudying) {
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('updateProfile'));
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Education Details</h1>

      {loading ? (
        <LoadingProgress />
      ) : !showForm ? (
        <div className="grid gap-5">
          {educationRecords?.map((record: any) => (
            <EducationCard key={record.id} education={record} refetch={refetch} onEdit={onEdit} />
          ))}

          <Button
            size="md"
            fullWidth
            color="primary"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={() => {
              setEditingId(null);
              setShowForm(true);
              setGradeValuesByType({ cgpa: '', percentage: '' });
              setTimeout(() => {
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
              }, 0);
            }}
          >
            Add more
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid sm:grid-cols-2 gap-5">
            {fields?.map((field) => {
              const fieldError = errors[field.name];

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
                      const isEndDate = field.name === 'endDate';

                      const dateValue = inputProps.value
                        ? dayjs(
                            inputProps.value.year
                              ? `${inputProps.value.year}-${inputProps.value.month}-${inputProps.value.day}`
                              : inputProps.value,
                          ).toDate()
                        : null;

                      return (
                        <div className="flex flex-col mb-2">
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
                            maxDate={dayjs().toDate()}
                            dateFormat="MM/yyyy"
                            showMonthYearPicker
                            customInput={
                              <Input
                                label={renderFieldLabel(field.label, field.isRequired)}
                                labelPlacement="outside"
                                placeholder={field.placeholder}
                                className={`w-full ${isEndDate && currentlyStudying ? 'cursor-not-allowed opacity-60' : ''}`}
                                size="lg"
                                isInvalid={!!fieldError}
                                errorMessage={fieldError?.message as string}
                                autoComplete="off"
                                disabled={isEndDate && currentlyStudying}
                                isDisabled={isEndDate && currentlyStudying}
                              />
                            }
                            disabled={isEndDate && currentlyStudying}
                            portalId="root-portal"
                            className="w-full"
                            wrapperClassName="w-full"
                          />

                          {isEndDate && (
                            <Controller
                              key="currentlyStudying"
                              control={control}
                              name={'currentlyStudying' as any}
                              render={({ field: currentlyStudyingProps }) => (
                                <div className="">
                                  <Checkbox
                                    {...currentlyStudyingProps}
                                    size="md"
                                    className="mt-1"
                                    isSelected={currentlyStudyingProps.value}
                                    onValueChange={(val) => {
                                      currentlyStudyingProps.onChange(val);
                                      if (val) {
                                        setValue?.('endDate', null as any);
                                      }
                                    }}
                                  >
                                    Currently Studying
                                  </Checkbox>
                                </div>
                              )}
                            />
                          )}
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
                          onChange={(event) => {
                            const sanitizedValue = sanitizeGradeValue(event.target.value);
                            setGradeValuesByType((prev) => ({
                              ...prev,
                              [selectedGradeType]: sanitizedValue,
                            }));
                            setValue?.('grade', sanitizedValue, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
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
                                      const currentGrade = sanitizeGradeValue(inputProps.value || '');
                                      const nextGradeValues: Record<string, string> = {
                                        ...gradeValuesByType,
                                        [selectedGradeType]: currentGrade,
                                      };
                                      const nextGrade = nextGradeValues[option.key] || '';

                                      setGradeValuesByType(nextGradeValues);
                                      setValue?.('gradeType', option.key, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      });
                                      setValue?.('grade', nextGrade, {
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
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                        onChange={(event) => {
                          const shouldFormat = field.type === 'text' && field.name !== 'grade';
                          inputProps.onChange(
                            shouldFormat
                              ? CommonUtils.toCamelCase(event.target.value)
                              : event.target.value,
                          );
                        }}
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
          message={conflictDialog.data?.message}
          conflicts={conflictDialog.data.conflicts}
          onSubmit={handleSubmit((data: any) => onSubmit(data, true))}
          onClose={() => setConflictDialog({ isOpen: false, data: null })}
        />
      )}
    </div>
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
    isRequired: true,
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
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: 'Enter start date',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: 'Enter end date',
    isDisabled: false,
    isRequired: true,
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
