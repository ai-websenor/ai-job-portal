'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import JobForm from '@/app/components/common/JobForm';
import BackButton from '@/app/components/lib/BackButton';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import { postJobValidation } from '@/app/utils/validations';
import { addToast } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

const defaultValues = {
  clientName: '',
  title: '',
  description: '',
  categoryId: '',
  subCategoryId: '',
  customCategory: '',
  customSubCategory: '',
  jobType: [],
  workMode: [],
  experienceMin: '',
  experienceMax: '',
  salaryMin: 5000,
  salaryMax: 22000,
  showSalary: true,
  location: '',
  skills: [],
  benefits: '',
  deadline: today(getLocalTimeZone()).add({ days: 7 }),
  validityDays: '',
  immigrationStatus: '',
  payRate: '',
  travelRequirements: '',
  qualification: '',
  certification: '',
  isFeatured: false,
};

const page = () => {
  const router = useRouter();

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(postJobValidation),
  });

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        experienceMin:
          data?.experienceMin === '' ||
          data?.experienceMin === undefined ||
          data?.experienceMin === null
            ? null
            : Number(data.experienceMin),
        experienceMax:
          data?.experienceMax === '' ||
          data?.experienceMax === undefined ||
          data?.experienceMax === null
            ? null
            : Number(data.experienceMax),
        validityDays:
          data?.validityDays === '' ||
          data?.validityDays === undefined ||
          data?.validityDays === null
            ? null
            : Number(data.validityDays),
        ...(data?.deadline && {
          deadline: dayjs(data?.deadline).toISOString(),
        }),
      };

      const response = await http.post(ENDPOINTS.EMPLOYER.JOBS.CREATE, {
        ...payload,
      });
      reset();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Job created successfully',
      });
      router.push(routePaths.employee.jobs.preview(response?.data?.id));
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <title>Job Post</title>
      <div className="container mx-auto py-8 px-4 md:px-6 grid gap-5">
        <BackButton showLabel />
        <JobForm
          errors={errors}
          control={control}
          setValue={setValue}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </>
  );
};

export default withAuth(page);
