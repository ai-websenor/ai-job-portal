'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CertificationCard from '@/app/components/cards/CertificationCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import OnboardingSkipButton from '@/app/components/lib/OnboardingSkipButton';
import routePaths from '@/app/config/routePaths';
import { OnboardingStepProps } from '@/app/types/types';
import { addToast, Button, DatePicker, Input } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd } from 'react-icons/md';

const Certifications = ({
  control,
  errors,
  refetch,
  setValue,
  handleSubmit,
  parsedRecords,
  onParsedSaved,
}: OnboardingStepProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localParsed, setLocalParsed] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);

  useEffect(() => {
    if (parsedRecords?.length) {
      setLocalParsed(
        parsedRecords.map((cert: any, i: number) => ({
          ...cert,
          _tempId: `parsed_cert_${i}`,
          _isParsed: true,
        })),
      );
    }
  }, []);

  const getCertifications = async () => {
    try {
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
      setCertifications(response?.data?.certifications || []);
    } catch (e) {
      console.debug('[Certifications] fetch error:', e);
    }
  };

  useEffect(() => {
    getCertifications();
  }, []);

  const onEdit = (record: any) => {
    setEditingId(record?.id || record?._tempId);
    setValue?.('name', record?.name);
    setValue?.('issuingOrganization', record?.issuingOrganization);
    setValue?.('credentialId', record?.credentialId);
    setValue?.('credentialUrl', record?.credentialUrl);

    if (record?.issueDate) {
      setValue?.('issueDate', parseDate(dayjs(record.issueDate).format('YYYY-MM-DD')));
    }
    if (record?.expiryDate) {
      setValue?.('expiryDate', parseDate(dayjs(record.expiryDate).format('YYYY-MM-DD')));
    }
    setShowForm(true);
  };

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);
    const payload = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)));

    try {
      setLoading(true);
      const formattedPayload = {
        ...payload,
        issueDate: payload?.issueDate ? dayjs(payload.issueDate as any).format('YYYY-MM-DD') : null,
        expiryDate: payload?.expiryDate
          ? dayjs(payload.expiryDate as any).format('YYYY-MM-DD')
          : null,
      };

      if (editingId?.toString().startsWith('parsed_cert_')) {
        setLocalParsed((prev) =>
          prev.map((rec) => (rec._tempId === editingId ? { ...rec, ...formattedPayload } : rec)),
        );
        setShowForm(false);
        setEditingId(null);
        setLoading(false);
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Certification updated locally',
        });
        return;
      }

      if (editingId) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_CERTIFICATION(editingId), formattedPayload);
      } else {
        await http.post(ENDPOINTS.CANDIDATE.ADD_CERTIFICATION, formattedPayload);
      }

      addToast({
        color: 'success',
        title: 'Success',
        description: `Certification ${editingId ? 'updated' : 'added'} successfully`,
      });
      getCertifications();

      if (showForm) {
        setShowForm(false);
        setEditingId(null);
      } else {
        router.push(routePaths.videoResume);
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
      if (certifications?.length > 0) {
        await Promise.all(
          certifications.map((rec: any) =>
            http
              .delete(ENDPOINTS.CANDIDATE.DELETE_CERTIFICATION(rec.id))
              .catch((e: unknown) => console.debug('[Certifications] delete:', e)),
          ),
        );
      }

      for (const cert of localParsed) {
        try {
          await http.post(ENDPOINTS.CANDIDATE.ADD_CERTIFICATION, {
            name: cert.name,
            issuingOrganization: cert.issuingOrganization || '',
            issueDate: cert.issueDate ? dayjs(cert.issueDate).format('YYYY-MM-DD') : null,
            expiryDate: cert.expiryDate ? dayjs(cert.expiryDate).format('YYYY-MM-DD') : null,
            credentialId: cert.credentialId || '',
            credentialUrl: cert.credentialUrl || '',
            forceSave: true,
          });
        } catch (e: unknown) {
          console.debug('[Certifications] parsed save error:', e);
        }
      }

      setLocalParsed([]);
      onParsedSaved?.();
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Certifications saved successfully',
      });
    } catch (e) {
      console.debug('[Certifications] save all error:', e);
    } finally {
      setLoading(false);
    }
    router.push(routePaths.videoResume);
  };

  if (loading) return <LoadingProgress />;

  const allRecords = [...certifications, ...localParsed];

  if (!showForm && allRecords.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {allRecords.map((record: any) => (
          <div key={record.id || record._tempId}>
            {record._isParsed && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 inline-block">
                From Resume
              </span>
            )}
            <CertificationCard
              {...({
                id: record.id || '',
                profileId: record.profileId || '',
                name: record.name || '',
                issuingOrganization: record.issuingOrganization || '',
                issueDate: record.issueDate || null,
                expiryDate: record.expiryDate || null,
                credentialId: record.credentialId || '',
                credentialUrl: record.credentialUrl || null,
                certificateFile: record.certificateFile || null,
                isVerified: record.isVerified || false,
              } as any)}
              onEdit={() => onEdit(record)}
              onDelete={
                record._isParsed
                  ? () =>
                      setLocalParsed((prev) =>
                        prev.filter((r: any) => r._tempId !== record._tempId),
                      )
                  : async () => {
                      try {
                        await http.delete(ENDPOINTS.CANDIDATE.DELETE_CERTIFICATION(record.id));
                        getCertifications();
                      } catch (e) {
                        console.debug('[Certifications] delete error:', e);
                      }
                    }
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
              fields.forEach((field) => setValue?.(field.name as any, ''));
              setShowForm(true);
            }}
          >
            Add more
          </Button>
        )}
        <div className="flex items-center justify-end gap-2 w-full mt-4">
          <OnboardingSkipButton />
          <Button
            size="md"
            color="primary"
            onPress={
              (parsedRecords ?? []).length > 0
                ? handleSaveAllParsed
                : () => router.push(routePaths.videoResume)
            }
          >
            {(parsedRecords ?? []).length > 0 ? 'Save & Finish' : 'Finish'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field) => {
        const fieldError = errors[field.name];

        // expiryDate is rendered inside the issueDate row — skip it here
        if (field.name === 'expiryDate') return null;

        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: inputProps }) => {
              const safeProps = {
                ...inputProps,
                value:
                  field.type === 'date'
                    ? (inputProps.value ?? undefined)
                    : (inputProps.value ?? ''),
              };

              if (field?.type === 'date') {
                // issueDate — render both issue and expiry in one 2-column row
                return (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Issue Date */}
                    <DatePicker
                      {...inputProps}
                      label={field.label}
                      size="md"
                      showMonthAndYearPickers
                      isInvalid={!!fieldError}
                      errorMessage={fieldError?.message}
                      value={inputProps.value || undefined}
                    />

                    {/* Expiry Date */}
                    <Controller
                      key="expiryDate"
                      control={control}
                      name={'expiryDate' as any}
                      render={({ field: expiryProps }) => (
                        <DatePicker
                          {...expiryProps}
                          label="Expiry Date"
                          size="md"
                          showMonthAndYearPickers
                          isInvalid={!!errors['expiryDate']}
                          errorMessage={errors['expiryDate']?.message}
                          value={expiryProps.value || undefined}
                        />
                      )}
                    />
                  </div>
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

      <div className="mt-3 flex items-center gap-3 justify-between">
        {showForm ? (
          <Button variant="bordered" onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 justify-end w-full">
          <OnboardingSkipButton />
          <Button endContent={<IoMdArrowForward size={18} />} color="primary" type="submit">
            Save
          </Button>
        </div>
      </div>
    </form>
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
