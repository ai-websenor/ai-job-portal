import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { ProfileEditProps } from '@/app/types/types';
import CertificationCard from '../cards/CertificationCard';
import { addToast, Button, DatePicker, Input } from '@heroui/react';
import { MdAdd } from 'react-icons/md';
import dayjs from 'dayjs';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '../lib/LoadingProgress';

const Certifications = ({
  control,
  errors,
  handleSubmit,
  refetch,
  isSubmitting,
}: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { certifications } = useWatch({ control });

  const toggleForm = () => setShowForm(!showForm);

  const onSubmit = async (data: any) => {
    const payload: any = {};

    for (const key in data) {
      const value = data[key];
      if (value) {
        if (key === 'issueDate' || key === 'expiryDate') {
          payload[key] = dayjs(value).format('YYYY-MM-DD');
        } else {
          payload[key] = value;
        }
      }
    }

    try {
      await http.post(ENDPOINTS.CANDIDATE.ADD_CERTIFICATION, payload);
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Certification added successfully',
      });
      refetch();
      toggleForm();
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_CERTIFICATION(id));
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Certification deleted successfully',
      });
      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Certifications</h1>

      {loading ? (
        <LoadingProgress />
      ) : !showForm ? (
        <div className="grid gap-5">
          {certifications?.map((record: any) => (
            <CertificationCard
              key={record.id}
              {...record}
              refetch={refetch}
              onDelete={() => handleDelete(record?.id)}
            />
          ))}

          <Button
            size="md"
            fullWidth
            color="default"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={toggleForm}
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
                    const safeProps = {
                      ...inputProps,
                      value:
                        field.type === 'date'
                          ? (inputProps.value ?? undefined)
                          : (inputProps.value ?? ''),
                    };

                    if (field?.type === 'date') {
                      return (
                        <DatePicker
                          {...inputProps}
                          label={field.label}
                          size="md"
                          className="mb-4"
                          showMonthAndYearPickers
                          isInvalid={!!fieldError}
                          errorMessage={fieldError?.message}
                          value={inputProps.value || undefined}
                        />
                      );
                    }

                    return (
                      <Input
                        {...safeProps}
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
    </div>
  );
};

export default Certifications;

const fields = [
  {
    name: 'name',
    type: 'text',
    label: 'Certificate Name',
    placeholder: 'e.g. Amazon Solutions Architect',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'issuingOrganization',
    type: 'text',
    label: 'Issuing Organization',
    placeholder: 'e.g. Amazon Web Services',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'issueDate',
    type: 'date',
    label: 'Issue Date',
    placeholder: 'e.g. 2022-01-01',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'expiryDate',
    type: 'date',
    label: 'Expiry Date',
    placeholder: 'e.g. 2022-01-01',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'credentialId',
    type: 'text',
    label: 'Credential ID',
    placeholder: 'e.g. AWS-123',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'credentialUrl',
    type: 'text',
    label: 'Credential URL',
    placeholder: 'e.g. https://www.amazon.com',
    isDisabled: false,
    isRequired: false,
  },
];
