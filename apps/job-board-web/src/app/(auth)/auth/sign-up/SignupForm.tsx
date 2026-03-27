'use client';

import { Roles } from '@/app/types/enum';
import { signupSchema } from '@/app/utils/validations';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Input, Button, addToast } from '@heroui/react';
import { motion } from 'framer-motion';
import PhoneNumberInput from '@/app/components/form/PhoneNumberInput';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import routePaths from '@/app/config/routePaths';
import PasswordInput from '@/app/components/form/PasswordInput';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  role: Roles.candidate,
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
    resolver: yupResolver(signupSchema),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      const response = await http.post(ENDPOINTS.AUTH.SIGNUP, {
        ...data,
        email: data.email.toLowerCase(),
      });

      if (response?.data) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Account created successfully',
        });
        router.push(`${routePaths.auth.verifyEmail}?email=${data.email}`);
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
                if (field.type === 'password') {
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

                if (field?.type === 'mobile') {
                  return (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground-600">
                        {field.label}
                      </label>
                      <PhoneNumberInput
                        value={value as string}
                        onChange={onChange}
                        placeholder={field.placeholder}
                        disabled={isSubmitting}
                      />
                      {error && <p className="text-tiny text-danger">{error.message}</p>}
                    </div>
                  );
                }

                return (
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
                  />
                );
              }}
            />
          );
        })}
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="sm"
        isLoading={isSubmitting}
        className="mt-4 h-12 font-bold text-lg bg-primary hover:bg-primary/80"
      >
        Sign Up
      </Button>
    </motion.form>
  );
};

export default SignupForm;

const fields = [
  {
    name: 'firstName',
    type: 'text',
    label: 'First name',
    placeholder: 'Example john',
  },
  {
    name: 'lastName',
    type: 'text',
    label: 'Last name',
    placeholder: 'Example deo',
  },
  {
    name: 'mobile',
    type: 'mobile',
    label: 'Phone Number',
    placeholder: '9834567890',
  },
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
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'At least 8 characters',
  },
];
