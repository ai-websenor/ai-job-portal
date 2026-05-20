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

const ForgotPasswordEmailVerifyForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get('role');
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

    try {
      const response = await http.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY_EMAIL, {
        email: email || '',
        otp: data.code,
      });

      if (response?.status) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'OTP verified successfully',
        });
        router.push(
          `${routePaths.auth.resetPassword}?resetPasswordToken=${response?.data?.resetPasswordToken}&role=${role}`,
        );
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
      submitLabel="Verify OTP"
      description={
        <>
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-semibold text-foreground">{email}</span>.
        </>
      }
      backHref={role === 'employee' ? routePaths.employee.auth.login : routePaths.auth.login}
      showResendText={false}
    />
  );
};

export default ForgotPasswordEmailVerifyForm;
