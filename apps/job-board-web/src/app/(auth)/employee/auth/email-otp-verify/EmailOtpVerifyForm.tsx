"use client";

import routePaths from "@/app/config/routePaths";
import { emailOTPVerifyValidation } from "@/app/utils/validations";
import { addToast, Button, InputOtp } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";

const defaultValues = {
  otp: "",
  sessionToken: "",
};

const EmailOtpVerifyForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const sessionToken = params.get("sessionToken");

  const {
    reset,
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

      const response = await http.post(
        ENDPOINTS.EMPLOYER.AUTH.VERIFY_EMAIL_OTP,
        data,
      );

      if (response?.data) {
        reset();
        addToast({
          color: "success",
          title: "Success",
          description: "OTP verified successfully",
        });
      }

      router.push(
        `${routePaths.employee.auth.onboarding}?sessionToken=${sessionToken}`,
      );
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

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
      >
        Verify
      </Button>
    </motion.form>
  );
};

export default EmailOtpVerifyForm;
