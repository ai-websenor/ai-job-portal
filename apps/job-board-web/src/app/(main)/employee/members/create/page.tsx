"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import MemberForm from "@/app/components/common/MemberForm";
import BackButton from "@/app/components/lib/BackButton";
import routePaths from "@/app/config/routePaths";
import withAuth from "@/app/hoc/withAuth";
import { memberFormValidation } from "@/app/utils/validations";
import { addToast } from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  password: "",
  confirmPassword: "",
  permissions: [],
};

const page = () => {
  const router = useRouter();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(memberFormValidation),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      const response = await http.post(ENDPOINTS.EMPLOYER.MEMBERS.CREATE, data);
      if (response?.data) {
        reset();
        router.push(
          `${routePaths.employee.members.update(response?.data?.userId)}?tab=2`,
        );
        addToast({
          color: "success",
          title: "Member Created",
          description: "Member created successfully",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <title>Create New Member</title>
      <div className="container mx-auto py-8 px-4 md:px-6 grid gap-5">
        <div>
          <BackButton showLabel />
          <h1 className="text-2xl font-bold mt-1">Create New Member</h1>
        </div>
        <MemberForm
          errors={errors}
          control={control}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </>
  );
};

export default withAuth(page);
