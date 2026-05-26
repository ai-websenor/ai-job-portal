'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import OtpSection from '@/app/components/lib/OtpSection';
import routePaths from '@/app/config/routePaths';
import { verifyEmailValidation } from '@/app/utils/validations';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { addToast } from '@heroui/react';

const defaultValues = {
  code: '',
  email: '',
};

const VerifyEmailForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email');

  const {
    reset,
    resetField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(verifyEmailValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    if (data?.code?.length !== 6) return;

    data.email = email as string;

    try {
      const response = await http.post(ENDPOINTS.AUTH.VERIFY_EMAIL, data);
      const result = response?.data;
      if (result) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Email verified successfully',
        });
        router.push(`${routePaths.auth.sendMobileOtp}?mobile=${result?.user?.mobile}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <OtpSection
      control={control}
      name="code"
      errorMessage={errors.code?.message}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      onResend={() => resetField('code')}
      submitLabel="Verify My Account"
      description={
        <>
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-semibold text-foreground">{email}</span>.
        </>
      }
      backHref={routePaths.auth.login}
      resend={{
        endpoint: ENDPOINTS.AUTH.RESEND_OTP,
        payload: { email: email! },
        timerDuration: 30,
      }}
    />
  );
};

export default VerifyEmailForm;
