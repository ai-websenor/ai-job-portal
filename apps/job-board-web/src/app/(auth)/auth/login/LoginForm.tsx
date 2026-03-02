'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { loginValidation } from '@/app/utils/validations';
import { addToast, Button, Input } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

const defaultValues = {
  email: '',
  password: '',
};

const LoginForm = () => {
  const router = useRouter();
  const { setUser } = useUserStore();
  const { setLocalStorage } = useLocalStorage();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(loginValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      const response = await http.post(ENDPOINTS.AUTH.LOGIN, {
        ...data,
        email: data.email.toLowerCase(),
      });
      const result = response?.data;
      if (result) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Login successfully',
        });
        setLocalStorage('token', result?.accessToken);
        setLocalStorage('refreshToken', result?.refreshToken);

        setUser({
          ...result?.user,
          role: Roles.candidate,
          isOnboardingCompleted: result?.user?.isOnboardingCompleted,
        });

        if (!result?.user?.isVerified) {
          router.push(`${routePaths.auth.verifyEmail}?email=${result?.user?.email}`);
          return;
        }

        if (result?.user?.role === Roles.candidate && !result?.user?.isOnboardingCompleted) {
          router.push(`${routePaths.auth.onboarding}?step=${result?.user?.onboardingStep || 1}`);
          return;
        }

        router.push(
          result?.user?.role === Roles.candidate
            ? routePaths.dashboard
            : routePaths.employee.dashboard,
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
      <div className="flex flex-col gap-4">
        {fields?.map((field, index) => {
          const error = errors?.[field?.name as keyof typeof defaultValues];

          return (
            <Controller
              key={field?.name}
              control={control}
              name={field?.name as keyof typeof defaultValues}
              render={({ field: { onChange, value } }) => {
                return (
                  <Input
                    type={field?.type}
                    label={field?.label}
                    placeholder={field?.placeholder}
                    value={value}
                    autoFocus={index === 0}
                    labelPlacement="outside"
                    size="lg"
                    onChange={onChange}
                    isInvalid={!!error}
                    errorMessage={error?.message}
                  />
                );
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-end">
        <Link
          href={routePaths.auth.forgotPassword}
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
        className="mt-4 h-12 font-bold text-lg bg-primary hover:bg-primary/80"
      >
        Login
      </Button>
    </motion.form>
  );
};

export default LoginForm;

const fields = [
  {
    name: 'email',
    type: 'text',
    label: 'Email',
    placeholder: 'example@email.com',
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'At least 8 characters',
  },
];
