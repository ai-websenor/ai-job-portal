"use client";

import routePaths from "@/app/config/routePaths";
import { employeeLoginValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Button, Input } from "@heroui/react";

const defaultValues = {
  email: "",
};

const LoginForm = () => {
  const router = useRouter();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(employeeLoginValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    router.push(
      `${routePaths.employee.auth.emailOtpVerify}?email=${data.email}`,
    );
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => {
            return (
              <Input
                type="email"
                label={"Email"}
                placeholder="email@example.com"
                value={value}
                autoFocus
                labelPlacement="outside"
                size="lg"
                onChange={onChange}
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
              />
            );
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          color="primary"
          size="lg"
          radius="sm"
          fullWidth
          isLoading={isSubmitting}
        >
          Login
        </Button>
      </div>
    </motion.form>
  );
};

export default LoginForm;
