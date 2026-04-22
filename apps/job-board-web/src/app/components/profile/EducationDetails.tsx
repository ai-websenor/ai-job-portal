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
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import dayjs from 'dayjs';
import LoadingProgress from '../lib/LoadingProgress';
import { parseDate } from '@internationalized/date';
import ConflictDatesDialog from '../dialogs/ConflictDatesDialog';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

  const { educationRecords, currentlyStudying } = useWatch({ control });

  const toggleForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      setEditingId(null);
    }
  };

  const onEdit = (education: any) => {
    setShowForm(true);
    setEditingId(education?.id);
    setTimeout(() => {
      setValue?.('degree', education?.degree, { shouldValidate: true, shouldDirty: true });
      setValue?.('institution', education?.institution, { shouldValidate: true, shouldDirty: true });
      setValue?.('fieldOfStudy', education?.fieldOfStudy, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue?.('grade', education?.grade || '', { shouldValidate: true, shouldDirty: true });
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
            <EducationCard
              key={record.id}
              education={record}
              refetch={refetch}
              onEdit={onEdit}
            />
          ))}

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
                fields.forEach((field) =>
                  setValue?.(field.name as any, field.name === 'currentlyStudying' ? false : ''),
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
