"use client";

import { employeeSignupValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import PhoneNumberInput from "@/app/components/form/PhoneNumberInput";
import { addToast, Button } from "@heroui/react";
import routePaths from "@/app/config/routePaths";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";

const defaultValues = {
  mobile: "",
};

const SignupForm = () => {
  const router = useRouter();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(employeeSignupValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      const response = await http.post(
        ENDPOINTS.EMPLOYER.AUTH.SEND_MOBILE_OTP,
        data,
      );
      if (response?.data) {
        reset();
        addToast({
          color: "success",
          title: "Success",
          description: "OTP sent successfully",
        });
      }
      router.push(
        `${routePaths.employee.auth.mobileOtpVerify}?sessionToken=${response?.data?.sessionToken}`,
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
        name={"mobile"}
        control={control}
        render={({ field: { onChange, value } }) => {
          return (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground-600">
                Mobile
              </label>
              <PhoneNumberInput
                value={value as string}
                onChange={onChange}
                disabled={isSubmitting}
              />
              {errors?.mobile && (
                <p className="text-tiny text-danger">{errors.mobile.message}</p>
              )}
            </div>
          );
        }}
      />
      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
      >
        Sign Up
      </Button>
    </motion.form>
  );
};

export default SignupForm;
