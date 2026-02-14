"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";
import { verifyEmailValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { addToast, Button, InputOtp } from "@heroui/react";

const defaultValues = {
  code: "",
  email: "",
};

const ForgotPasswordEmailVerifyForm = () => {
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
    resolver: yupResolver(verifyEmailValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    if (data?.code?.length !== 6) return;

    try {
      const response = await http.post(
        ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY_EMAIL,
        {
          email: email || "",
          otp: data.code,
        },
      );

      if (response?.status) {
        reset();
        addToast({
          color: "success",
          title: "Success",
          description: "OTP verified successfully",
        });
        router.push(
          `${routePaths.auth.resetPassword}?resetPasswordToken=${response?.data?.resetPasswordToken}`,
        );
      }
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
        className="mt-4 h-12 font-bold text-lg bg-primary hover:bg-primary/80"
      >
        Verify
      </Button>
    </motion.form>
  );
};

export default ForgotPasswordEmailVerifyForm;
