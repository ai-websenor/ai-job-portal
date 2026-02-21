"use client";

import { CommonFormProps } from "@/app/types/types";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Tab,
  Tabs,
  Tooltip,
} from "@heroui/react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import PhoneNumberInput from "../form/PhoneNumberInput";
import { HiLockClosed } from "react-icons/hi";
import { useSearchParams } from "next/navigation";
import EmployeePermissionGroup from "./EmployeePermissionForm";

const MemberForm = ({
  id,
  control,
  errors,
  onSubmit,
  isSubmitting,
}: CommonFormProps) => {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(defaultTab || "1");
  const [isVisible, setIsVisible] = useState({
    password: false,
    confirmPassword: false,
  });

  const toggleVisibility = (field: keyof typeof isVisible) => {
    setIsVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="grid gap-10">
      <Card shadow="none" className="p-5">
        <CardHeader>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key.toString())}
            color="primary"
            variant="underlined"
            className="mb-3"
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
          {activeTab === "1" ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {fields["1"]
                .filter((field) => {
                  if (
                    id &&
                    (field.name === "password" ||
                      field.name === "confirmPassword")
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((field) => {
                  const error = errors?.[field?.name];

                  const inputType =
                    field.type === "password"
                      ? isVisible[field?.name as keyof typeof isVisible]
                        ? "text"
                        : "password"
                      : field.type;

                  return (
                    <Controller
                      key={field.name}
                      name={field.name}
                      control={control}
                      render={({ field: { onChange, value } }) => {
                        if (field?.type === "phone") {
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
                            type={inputType}
                            label={field.label}
                            placeholder={field.placeholder}
                            value={value}
                            size="lg"
                            labelPlacement="outside"
                            onChange={onChange}
                            isInvalid={!!error}
                            errorMessage={error?.message}
                            endContent={
                              field?.type === "password" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleVisibility(
                                      field?.name as keyof typeof isVisible,
                                    )
                                  }
                                  className="focus:outline-none"
                                >
                                  {isVisible[
                                    field?.name as keyof typeof isVisible
                                  ] ? (
                                    <IoEyeOutline
                                      size={19}
                                      className="text-default-400"
                                    />
                                  ) : (
                                    <IoEyeOffOutline
                                      size={19}
                                      className="text-default-400"
                                    />
                                  )}
                                </button>
                              )
                            }
                          />
                        );
                      }}
                    />
                  );
                })}
            </div>
          ) : (
            <EmployeePermissionGroup control={control} />
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
  "1": [
    {
      name: "firstName",
      type: "text",
      label: "First Name",
      placeholder: "Enter your first name",
    },
    {
      name: "lastName",
      type: "text",
      label: "Last Name",
      placeholder: "Enter your last name",
    },
    {
      name: "email",
      type: "text",
      label: "Email",
      placeholder: "Enter your email",
    },
    {
      name: "designation",
      type: "text",
      label: "Designation",
      placeholder: "Enter your designation",
    },
    {
      name: "department",
      type: "text",
      label: "Department",
      placeholder: "Enter your department",
    },
    {
      name: "mobile",
      type: "phone",
      label: "Phone",
      placeholder: "Enter your phone",
    },
    {
      name: "password",
      type: "password",
      label: "Password",
      placeholder: "Enter your password",
    },
    {
      name: "confirmPassword",
      type: "password",
      label: "Confirm Password",
      placeholder: "Enter your confirm password",
    },
  ],
  "2": [],
};

const tabs = [
  {
    key: "1",
    label: "Profile",
    requiresId: false,
  },
  {
    key: "2",
    label: "Permissions",
    requiresId: true,
  },
];
