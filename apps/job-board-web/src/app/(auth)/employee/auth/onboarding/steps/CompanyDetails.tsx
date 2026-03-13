'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import FileUploader from '@/app/components/form/FileUploader';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { OnboardingStepProps } from '@/app/types/types';
import { addToast, Button, Card, CardBody, Input } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdOutlineVideoCameraFront } from 'react-icons/md';
import { RiDeleteBinLine } from 'react-icons/ri';

const CompanyDetails = ({
  errors,
  reset,
  control,
  handleSubmit,
  isSubmitting,
}: OnboardingStepProps) => {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();
  const sessionToken = params.get('sessionToken') as string;
  const [document, setDocument] = useState<File | null>(null);

  const onSubmit = async (data: any) => {
    const allowedKeys = fields.map((field) => field.name);

    const payload = Object.keys(data)
      .filter((key) => allowedKeys.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    try {
      if (document) {
        const res = await handleUploadGSTDocument();
        if (!res) return;
      }

      payload.sessionToken = sessionToken;

      const response = await http.post(ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.COMPANY_DETAILS, payload);

      const result = response?.data;

      if (result) {
        reset?.();

        setLocalStorage('token', result?.accessToken);
        setLocalStorage('refreshToken', result?.refreshToken);

        addToast({
          color: 'success',
          title: 'Success',
          description: 'Registration successfully',
        });

        router.push(routePaths.employee.dashboard);
        setUser({
          ...result?.user,
          company: result?.company,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleUploadGSTDocument = async () => {
    const payload = {
      sessionToken: sessionToken,
      fileName: document?.name,
      contentType: document?.type,
    };
    return await http.post(ENDPOINTS.EMPLOYER.AUTH.ONBOARDING.GST_PRE_SIGNED_URL, payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      {fields?.map((field, index) => {
        const fieldError = errors[field.name];
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            render={({ field: inputProps }) => {
              return (
                <Input
                  {...inputProps}
                  readOnly={field.isDisabled}
                  labelPlacement="outside"
                  size="lg"
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  label={field.label}
                  isInvalid={!!fieldError}
                  className="mb-4"
                  errorMessage={fieldError?.message}
                />
              );
            }}
          />
        );
      })}

      <div>
        <p className="mb-2">GST Document</p>
        {document ? (
          <Card radius="sm" shadow="none" className="border-primary bg-secondary border">
            <CardBody className="flex flex-row items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <MdOutlineVideoCameraFront className="text-primary text-xl flex-shrink-0" />
                <span className="text-sm font-medium truncate text-neutral-800">
                  {document?.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onPress={() => setDocument(null)}
                  size="sm"
                  isIconOnly
                  color="danger"
                  variant="flat"
                >
                  <RiDeleteBinLine size={16} />
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <FileUploader accept="application/*" onChange={setDocument} />
        )}
        {errors?.gstDocument?.message && (
          <p className="text-red-500 text-xs">{errors?.gstDocument?.message}</p>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <Button
          endContent={<IoMdArrowForward size={18} />}
          color="primary"
          type="submit"
          isLoading={isSubmitting}
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export default CompanyDetails;

export const fields = [
  {
    name: 'companyName',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Example company name',
    isDisabled: false,
  },
  {
    name: 'panNumber',
    type: 'text',
    label: 'Pan Number',
    placeholder: 'Example pan number',
    isDisabled: false,
  },
  {
    name: 'gstNumber',
    type: 'text',
    label: 'GST Number',
    placeholder: 'Example gst number',
    isDisabled: false,
  },
  {
    name: 'cinNumber',
    type: 'text',
    label: 'Company Identification Number',
    placeholder: 'Example cin number',
    isDisabled: false,
  },
];
