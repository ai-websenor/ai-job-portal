"use client";

import routePaths from "@/app/config/routePaths";
import { mobileOtpVerifyValidation } from "@/app/utils/validations";
import { Button, InputOtp } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";

const defaultValues = {
  code: "",
  mobile: "",
};

const MobileOtpVerifyForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const mobile = params.get("mobile");

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(mobileOtpVerifyValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    router.push(routePaths.employee.auth.login);
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

export default MobileOtpVerifyForm;
