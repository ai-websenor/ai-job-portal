'use client';

import { employeeLoginValidation } from '@/app/utils/validations';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { addToast, Button, Input } from '@heroui/react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import useUserStore from '@/app/store/useUserStore';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { Roles } from '@/app/types/enum';
import routePaths from '@/app/config/routePaths';
import Link from 'next/link';
import PasswordInput from '@/app/components/form/PasswordInput';

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
    resolver: yupResolver(employeeLoginValidation),
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

        const role = result?.user?.role;

        if (!result?.user?.isVerified) {
          router.push(
            role === Roles.candidate
              ? `${routePaths.auth.verifyEmail}?email=${result?.user?.email}`
              : `${routePaths.employee.auth.emailOtp}?email=${result?.user?.email}`,
          );
          return;
        }

        if (!result?.user?.isMobileVerified && role === Roles.candidate) {
          router.push(`${routePaths.auth.sendMobileOtp}?mobile=${result?.user?.mobile}`);
          return;
        }

        setLocalStorage('token', result?.accessToken);
        setLocalStorage('refreshToken', result?.refreshToken);
        if (result?.user?.isOnboardingCompleted) {
          setLocalStorage('isOnboardingCompleted', result?.user?.isOnboardingCompleted);
        }

        setUser(result?.user);

        router.push(
          role === Roles.candidate ? routePaths.dashboard : routePaths.employee.dashboard,
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
                if (field.name === 'password') {
                  return (
                    <PasswordInput
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
                }

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
          href={routePaths.employee.auth.forgotPassword}
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot Password?
        </Link>
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
