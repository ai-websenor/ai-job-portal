"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";
import { resetPasswordValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { addToast, Button, Input } from "@heroui/react";
import { useState } from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

const defaultValues = {
  newPassword: "",
  confirmPassword: "",
};

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState({
    password: false,
    confirmPassword: false,
  });

  const resetPasswordToken = searchParams.get("resetPasswordToken");

  const toggleVisibility = (field: keyof typeof isVisible) => {
    setIsVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(resetPasswordValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      await http.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        ...data,
        resetPasswordToken,
      });

      reset();
      router.push(routePaths.auth.login);
      addToast({
        color: "success",
        title: "Success",
        description: "Password reset successfully",
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
      {fields.map((field, index) => {
        const error = errors?.[field?.name as keyof typeof defaultValues];

        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name as keyof typeof defaultValues}
            render={({ field: { onChange, value } }) => (
              <Input
                label={field?.label}
                placeholder={field?.placeholder}
                value={value}
                autoFocus={index === 0}
                labelPlacement="outside"
                size="lg"
                onChange={onChange}
                isInvalid={!!error}
                errorMessage={error?.message}
                endContent={
                  <button
                    type="button"
                    onClick={() =>
                      toggleVisibility(field?.name as keyof typeof isVisible)
                    }
                    className="focus:outline-none"
                  >
                    {isVisible[field?.name as keyof typeof isVisible] ? (
                      <IoEyeOutline className="text-default-400" />
                    ) : (
                      <IoEyeOffOutline className="text-default-400" />
                    )}
                  </button>
                }
              />
            )}
          />
        );
      })}

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

export default ResetPasswordForm;

const fields = [
  {
    name: "newPassword",
    label: "Password",
    placeholder: "At least 8 characters",
    isPassword: true,
  },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    placeholder: "At least 8 characters",
    isPassword: true,
  },
];
