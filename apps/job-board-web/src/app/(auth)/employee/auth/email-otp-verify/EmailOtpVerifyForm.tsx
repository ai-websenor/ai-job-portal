"use client";

import routePaths from "@/app/config/routePaths";
import { emailOTPVerifyValidation } from "@/app/utils/validations";
import { Button, InputOtp } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";

const defaultValues = {
  code: "",
  email: "",
};

const EmailOtpVerifyForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");

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
    router.push(routePaths.employee.auth.onboarding);
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
        name="code"
        control={control}
        render={({ field }) => (
          <InputOtp
            size="lg"
            autoFocus
            length={6}
            {...field}
            errorMessage={errors.code?.message}
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
