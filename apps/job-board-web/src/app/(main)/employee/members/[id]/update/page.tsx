'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import MemberForm from '@/app/components/common/MemberForm';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import { memberUpdateValidation } from '@/app/utils/validations';
import { addToast } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const defaultValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  designation: '',
  department: '',
  password: '',
  confirmPassword: '',
  permissions: [],
  permissionIds: [],
};

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const { id } = use(params);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || '1');

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(memberUpdateValidation[activeTab]),
  });

  const getEmployeeDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.MEMBERS.DETAILS(id));
      const data = response?.data;
      if (data) {
        reset({
          ...data,
          permissionIds: [],
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEmployeeDetails();
  }, []);

  const onSubmit = (data: typeof defaultValues) => {
    if (activeTab === '1') {
      updatePersonalInformation(data);
    } else {
      updatePermissions(data);
    }
  };

  const updatePersonalInformation = async (data: typeof defaultValues) => {
    try {
      const { permissionIds, ...rest } = data;
      const response = await http.put(ENDPOINTS.EMPLOYER.MEMBERS.UPDATE(id), rest);
      if (response?.data) {
        reset();
        router.push(routePaths.employee.members.list);
        addToast({
          color: 'success',
          title: 'Member Updated',
          description: 'Member updated successfully',
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updatePermissions = async (data: typeof defaultValues) => {
    console.log(data?.permissionIds);
  };

  return (
    <>
      <title>Update Member</title>
      <div className="container mx-auto py-8 px-4 md:px-6 grid gap-5">
        <div>
          <BackButton showLabel />
          <h1 className="text-2xl font-bold mt-1">Update Member</h1>
        </div>
        {loading ? (
          <LoadingProgress />
        ) : (
          <MemberForm
            id={id}
            errors={errors}
            control={control}
            setValue={setValue}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit(onSubmit)}
          />
        )}
      </div>
    </>
  );
};

export default withAuth(page);
