"use client";

import BackButton from "@/app/components/lib/BackButton";
import { employeeEmailSignupValidation } from "@/app/utils/validations";
import { addToast, Button, Input } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";

const page = () => {
  const router = useRouter();
  const params = useSearchParams();
  const sessionToken = params.get("sessionToken");

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: "" },
    resolver: yupResolver(employeeEmailSignupValidation),
  });

  const onSubmit = async (data: any) => {
    try {
      data.sessionToken = sessionToken;

      const response = await http.post(
        ENDPOINTS.EMPLOYER.AUTH.SEND_EMAIL_OTP,
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
        `${routePaths.employee.auth.emailOtpVerify}?sessionToken=${response?.data?.sessionToken}`,
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Welcome</h1>
      <p className="text-gray-700 text-lg mb-7">
        Enter your email for verfication code
      </p>

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
                {...field}
                autoFocus
                label={"Email"}
                placeholder={"example@email.com"}
                labelPlacement="outside"
                size="lg"
                isInvalid={!!errors?.email}
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
        >
          Send OTP
        </Button>
      </motion.form>
    </div>
  );
};

export default page;
