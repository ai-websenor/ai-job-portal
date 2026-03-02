"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";
import { forgotPasswordValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { addToast, Button, Input } from "@heroui/react";

const defaultValues = {
  email: "",
};

const ForgotPasswordForm = () => {
  const router = useRouter();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(forgotPasswordValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      const res: any = await http.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
      if (res?.data) {
        reset();
        router.push(
          `${routePaths.auth.forgotPasswordVerifyEmail}?email=${data?.email}`,
        );
        addToast({
          color: "primary",
          title: "Information",
          description: res?.message,
        });
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
        name={"email"}
        control={control}
        render={({ field }) => {
          return (
            <Input
              autoFocus
              size="lg"
              {...field}
              label={"Email"}
              labelPlacement="outside"
              isInvalid={!!errors?.email}
              placeholder={"example@email.com"}
              errorMessage={errors?.email?.message}
            />
          );
        }}
      />

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
        className="mt-4 h-12 font-bold text-lg bg-primary hover:bg-primary/80"
      >
        Reset Password
      </Button>
    </motion.form>
  );
};

export default ForgotPasswordForm;
