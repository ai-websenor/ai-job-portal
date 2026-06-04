'use client';

import { CommonFormProps } from '@/app/types/types';
import { Button, Card, CardBody, CardHeader, Input, Tab, Tabs, Tooltip } from '@heroui/react';
import { Controller } from 'react-hook-form';
import PhoneNumberInput from '../form/PhoneNumberInput';
import { HiLockClosed } from 'react-icons/hi';
import EmployeePermissionGroup from './EmployeePermissionForm';
import PasswordInput from '../form/PasswordInput';
import CommonUtils from '@/app/utils/commonUtils';
import RequiredLabel from '../form/RequiredLabel';

interface Props extends CommonFormProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MemberForm = ({
  id,
  control,
  errors,
  onSubmit,
  isSubmitting,
  activeTab,
  setValue,
  setActiveTab,
}: Props) => {
  return (
    <div className="grid gap-10">
      <Card shadow="none" className="p-5">
        <CardHeader>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key.toString())}
            color="primary"
            variant="underlined"
            size="lg"
          >
            {tabs.map((tab) => {
              const isDisabled = tab.requiresId && !id;
              return (
                <Tab
                  key={tab.key}
                  className="font-medium"
                  isDisabled={isDisabled}
                  title={
                    <Tooltip
                      content="Create member first"
                      isDisabled={!isDisabled}
                      placement="top"
                      size="sm"
                      color="danger"
                      closeDelay={0}
                    >
                      <div className="flex items-center gap-2">
                        <span>{tab.label}</span>
                        {isDisabled && <HiLockClosed className="text-small" />}
                      </div>
                    </Tooltip>
                  }
                />
              );
            })}
          </Tabs>
        </CardHeader>

        <CardBody>
          {activeTab === '1' ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {fields['1']
                .filter((field) => {
                  if (id && (field.name === 'password' || field.name === 'confirmPassword')) {
                    return false;
                  }
                  return true;
                })
                .map((field) => {
                  const error = errors?.[field?.name];

                  return (
                    <Controller
                      key={field.name}
                      name={field.name}
                      control={control}
                      render={({ field: { onChange, value } }) => {
                        if (field.type === 'password') {
                          return (
                            <PasswordInput
                              label={
                                <RequiredLabel isRequired={field.isRequired}>
                                  {field.label}
                                </RequiredLabel>
                              }
                              placeholder={field.placeholder}
                              value={value}
                              labelPlacement="outside"
                              size="lg"
                              onChange={onChange}
                              isInvalid={!!error}
                              errorMessage={error?.message}
                            />
                          );
                        }

                        if (field.type === 'phone') {
                          return (
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-medium text-foreground-600">
                                <RequiredLabel isRequired={field.isRequired}>
                                  {field.label}
                                </RequiredLabel>
                              </label>

                              <PhoneNumberInput
                                value={value as string}
                                onChange={onChange}
                                placeholder={field.placeholder}
                                disabled={isSubmitting}
                              />

                              {error && (
                                <p className="text-tiny text-danger">
                                  {error.message}
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Input
                            label={
                              <RequiredLabel isRequired={field.isRequired}>
                                {field.label}
                              </RequiredLabel>
                            }
                            placeholder={field.placeholder}
                            value={value}
                            size="lg"
                            labelPlacement="outside"
                            onChange={(event) => {
                              const isMiddleNameField = field.name === 'middleName';

                              const isFirstOrLastNameField =
                                field.name === 'firstName' ||
                                field.name === 'lastName';

                              const shouldFormat = [
                                'designation',
                                'department',
                              ].includes(field.name);

                              onChange(
                                isFirstOrLastNameField
                                  ? CommonUtils.formatPersonName(
                                    event.target.value,
                                    {
                                      allowSpaces: false,
                                    },
                                  )
                                  : isMiddleNameField
                                    ? CommonUtils.formatPersonName(
                                      event.target.value,
                                    )
                                    : shouldFormat
                                      ? CommonUtils.toCamelCase(
                                        event.target.value,
                                      )
                                      : event.target.value,
                              );
                            }}
                            onKeyDown={(event) => {
                              const isMiddleNameField =
                                field.name === 'middleName';

                              const isFirstOrLastNameField =
                                field.name === 'firstName' ||
                                field.name === 'lastName';

                              const isNameField =
                                isFirstOrLastNameField ||
                                isMiddleNameField;

                              if (
                                isNameField &&
                                event.key.length === 1 &&
                                !CommonUtils.isPersonNameCharacter(
                                  event.key,
                                  {
                                    allowSpaces: isMiddleNameField,
                                  },
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                            isInvalid={!!error}
                            errorMessage={error?.message}
                          />
                        );
                      }}
                    />
                  );
                })}
            </div>
          ) : (
            <EmployeePermissionGroup setValue={setValue} control={control} errors={errors} />
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button color="primary" isLoading={isSubmitting} onPress={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
};

export default MemberForm;

const fields = {
  '1': [
    {
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      placeholder: 'Enter Your First Name',
      isRequired: true,
    },
    {
      name: 'middleName',
      type: 'text',
      label: 'Middle Name',
      placeholder: 'Enter Your Middle Name',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      placeholder: 'Enter Your Last Name',
      isRequired: true,
    },
    {
      name: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'Enter Your Email',
      isRequired: true,
    },
    {
      name: 'designation',
      type: 'text',
      label: 'Designation',
      placeholder: 'Enter Your Designation',
      isRequired: true,
    },
    {
      name: 'department',
      type: 'text',
      label: 'Department',
      placeholder: 'Enter Your Department',
      isRequired: true,
    },
    {
      name: 'mobile',
      type: 'phone',
      label: 'Phone',
      placeholder: 'Enter Your Phone',
      isRequired: true,
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: 'Enter Your Password',
      isRequired: true,
    },
    {
      name: 'confirmPassword',
      type: 'password',
      label: 'Confirm Password',
      placeholder: 'Enter Your Confirm Password',
      isRequired: true,
    },
  ],
  '2': [],
};

const tabs = [
  {
    key: '1',
    label: 'Profile',
    requiresId: false,
  },
  {
    key: '2',
    label: 'Permissions',
    requiresId: true,
  },
];
