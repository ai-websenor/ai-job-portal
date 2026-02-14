"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";
import useUserStore from "@/app/store/useUserStore";
import { verifyEmailValidation } from "@/app/utils/validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { motion } from "framer-motion";
import useLocalStorage from "@/app/hooks/useLocalStorage";
import { addToast, Button, InputOtp } from "@heroui/react";

const defaultValues = {
  code: "",
  email: "",
};

const VerifyEmailForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();

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

    data.email = email as string;

    try {
      const response = await http.post(ENDPOINTS.AUTH.VERIFY_EMAIL, data);
      const result = response?.data;
      if (result) {
        reset();
        setUser(result?.user);
        addToast({
          color: "success",
          title: "Success",
          description: "Account verified successfully",
        });
        setLocalStorage("token", result?.accessToken);
        setLocalStorage("refreshToken", result?.refreshToken);
        if (result?.user?.isOnboardingCompleted) {
          router.push(routePaths.dashboard);
        } else {
          router.push(routePaths.auth.onboarding);
        }
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
        Verify My Account
      </Button>
    </motion.form>
  );
};

export default VerifyEmailForm;
