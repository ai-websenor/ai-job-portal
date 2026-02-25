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
  title: '',
  description: '',
  categoryId: '',
  subCategoryId: '',
  jobType: [],
  workMode: [],
  experienceMin: '',
  experienceMax: '',
  salaryMin: 5000,
  salaryMax: 22000,
  showSalary: true,
  location: '',
  city: '',
  state: '',
  country: '',
  skills: ['python', 'SQL', 'Data Analysis'],
  benefits: '',
  deadline: today(getLocalTimeZone()).add({ days: 7 }),
  immigrationStatus: '',
  payRate: '',
  travelRequirements: '',
  qualification: '',
  certification: '',
};

const page = () => {
  const router = useRouter();

  const {
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
      const response = await http.post(ENDPOINTS.EMPLOYER.JOBS.CREATE, {
        ...data,
        ...(data?.deadline && {
          deadline: dayjs(data?.deadline).toISOString(),
        }),
      });
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
