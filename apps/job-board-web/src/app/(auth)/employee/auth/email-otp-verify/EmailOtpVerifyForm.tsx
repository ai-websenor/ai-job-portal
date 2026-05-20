'use client';

import routePaths from '@/app/config/routePaths';
import OtpSection from '@/app/components/lib/OtpSection';
import { emailOTPVerifyValidation } from '@/app/utils/validations';
import { addToast } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';

const defaultValues = {
  otp: '',
  sessionToken: '',
};

const EmailOtpVerifyForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email');
  const sessionToken = params.get('sessionToken');

  const {
    reset,
    resetField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(emailOTPVerifyValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      data.sessionToken = sessionToken!;

      const response = await http.post(ENDPOINTS.EMPLOYER.AUTH.VERIFY_EMAIL_OTP, data);

      if (response?.data) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'OTP verified successfully',
        });
      }

      router.push(`${routePaths.employee.auth.onboarding}?sessionToken=${sessionToken}`);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <OtpSection
      control={control}
      name="otp"
      errorMessage={errors.otp?.message}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      onResend={() => resetField('otp')}
      submitLabel="Verify OTP"
      backHref={routePaths.employee.auth.login}
      resend={{
        endpoint: ENDPOINTS.EMPLOYER.AUTH.RESEND_OTP,
        payload: {
          email: email!,
          sessionToken: sessionToken!,
        },
        timerDuration: 30,
      }}
    />
  );
};

export default EmailOtpVerifyForm;
