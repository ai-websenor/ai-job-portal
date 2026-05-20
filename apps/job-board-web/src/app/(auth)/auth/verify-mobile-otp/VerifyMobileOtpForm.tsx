'use client';

import OtpSection from '@/app/components/lib/OtpSection';
import { verifyMobileOtpValidation } from '@/app/utils/validations';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import ENDPOINTS from '@/app/api/endpoints';
import { addToast } from '@heroui/react';
import http from '@/app/api/http';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import routePaths from '@/app/config/routePaths';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';

const defaultValues = {
  otp: '',
  mobile: '',
};

const VerifyMobileOtpForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get('mobile');
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();

  const {
    reset,
    resetField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(verifyMobileOtpValidation),
  });

  useEffect(() => {
    if (!mobile) {
      router.back();
    }
  }, [mobile, router]);

  const onSubmit = async (data: typeof defaultValues) => {
    if (data?.otp?.length !== 6) return;

    data.mobile = `+${mobile?.trim()}`;

    try {
      const response = await http.post(ENDPOINTS.AUTH.VERIFY_MOBILE_OTP, data);
      const result = response?.data;

      if (result) {
        reset();

        addToast({
          title: 'Success',
          color: 'success',
          description: 'Mobile number verified successfully',
        });

        setUser(result?.user);

        setLocalStorage('token', result?.accessToken);
        setLocalStorage('refreshToken', result?.refreshToken);

        if (result?.user?.isOnboardingCompleted || result?.user?.role !== Roles.candidate) {
          router.push(
            result?.user?.role === Roles.candidate
              ? routePaths.dashboard
              : routePaths.employee.dashboard,
          );
        } else {
          router.push(`${routePaths.auth.onboarding}?step=${result?.user?.onboardingStep || 1}`);
        }
      }
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
      submitLabel="Verify Mobile"
      description={
        <>
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-semibold text-foreground">+{mobile}</span>.
        </>
      }
      backHref={routePaths.auth.login}
      resend={{
        endpoint: ENDPOINTS.AUTH.RESEND_MOBILE_OTP,
        payload: { mobile: `+${mobile?.trim()}` },
        timerDuration: 30,
      }}
    />
  );
};

export default VerifyMobileOtpForm;
