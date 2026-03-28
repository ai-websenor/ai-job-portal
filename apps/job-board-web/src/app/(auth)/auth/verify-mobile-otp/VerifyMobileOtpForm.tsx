'use client';

import { verifyMobileOtpValidation } from '@/app/utils/validations';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import ResendOtpButton from '@/app/components/lib/ResendOtpButton';
import ENDPOINTS from '@/app/api/endpoints';
import { addToast, Button, InputOtp } from '@heroui/react';
import http from '@/app/api/http';

const defaultValues = {
  otp: '',
};

const VerifyMobileOtpForm = () => {
  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(verifyMobileOtpValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    if (data?.otp?.length !== 6) return;

    try {
      await http.post(ENDPOINTS.AUTH.VERIFY_MOBILE_OTP, data);
      reset();
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Mobile number verified successfully',
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full"
    >
      <div>
        <Controller
          name="otp"
          control={control}
          render={({ field }) => (
            <InputOtp
              size="lg"
              autoFocus
              length={6}
              {...field}
              errorMessage={errors.otp?.message}
            />
          )}
        />
        <ResendOtpButton endpoint={ENDPOINTS.AUTH.RESEND_MOBILE_OTP} />
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
        className="h-12 font-bold text-lg bg-primary hover:bg-primary/80"
      >
        Verify Mobile
      </Button>
    </motion.form>
  );
};

export default VerifyMobileOtpForm;
