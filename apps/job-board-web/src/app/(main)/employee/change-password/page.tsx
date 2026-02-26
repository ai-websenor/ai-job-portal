'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { changePasswordValidation } from '@/app/utils/validations';
import { addToast, Button, Card, CardBody, Form, Input } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';

const defaultValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const page = () => {
  const [isVisible, setIsVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(changePasswordValidation),
  });

  const toggleVisibility = (field: keyof typeof isVisible) => {
    setIsVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      await http.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
      reset();
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Password changed successfully',
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <title>Change Password</title>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Change Password</h1>
        </div>

        <Card className="p-5 w-full max mx-auto">
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <div className="grid sm:grid-cols-2 gap-10 w-full">
                {fields.map((field, index) => {
                  const error = errors?.[field?.name as keyof typeof defaultValues];

                  const inputType =
                    field.type === 'password'
                      ? isVisible[field?.name as keyof typeof isVisible]
                        ? 'text'
                        : 'password'
                      : field.type;

                  return (
                    <Controller
                      key={field.name}
                      control={control}
                      name={field?.name as keyof typeof defaultValues}
                      render={({ field: inputProps }) => (
                        <Input
                          fullWidth
                          type={inputType}
                          label={field?.label}
                          placeholder={field?.placeholder}
                          value={inputProps.value}
                          autoFocus={index === 0}
                          labelPlacement="outside"
                          size="lg"
                          onChange={inputProps.onChange}
                          isInvalid={!!error}
                          errorMessage={error?.message}
                          endContent={
                            field?.type === 'password' && (
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
                            )
                          }
                        />
                      )}
                    />
                  );
                })}
              </div>

              <div className="w-full mt-2 flex justify-end">
                <Button color="primary" type="submit" isLoading={isSubmitting}>
                  Submit
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default withAuth(page);

const fields = [
  {
    name: 'currentPassword',
    type: 'password',
    label: 'Current Password',
    placeholder: 'At least 8 characters',
  },
  {
    name: 'newPassword',
    type: 'password',
    label: 'New Password',
    placeholder: 'At least 8 characters',
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'At least 8 characters',
  },
];
