'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import JobForm from '@/app/components/common/JobForm';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import { postJobValidation } from '@/app/utils/validations';
import { addToast } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
  salaryRange: '',
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

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const { title } = useWatch({ control });

  const getJobDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.JOBS.DETAILS(id));
      if (response?.data) {
        const data = response.data;
        if (data.deadline) {
          const dateOnly = data.deadline.split('T')[0];
          data.deadline = parseDate(dateOnly);
        }
        data.salaryRange = [data?.salaryMin, data?.salaryMax];
        reset(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobDetails();
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const response = await http.put(ENDPOINTS.EMPLOYER.JOBS.UPDATE(id), data);
      if (response?.data) {
        reset();
        addToast({
          color: 'success',
          title: 'Success',
          description: 'Job updated successfully',
        });
        router.push(routePaths.employee.jobs.preview(id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingProgress />;

  return (
    <>
      <title>{title ?? ''}</title>
      <div className="container mx-auto py-8 px-4 md:px-6 grid gap-5">
        <BackButton showLabel />
      </div>
      <JobForm
        control={control}
        setValue={setValue}
        errors={errors}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit(onSubmit)}
      />
    </>
  );
};

export default withAuth(page);
