'use client';

import { employeeOnboardingValidation } from '@/app/utils/validations';
import { Tab, Tabs } from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import BasicDetails from './steps/BasicDetails';
import CompanyDetails from './steps/CompanyDetails';
import { TbLockBitcoin } from 'react-icons/tb';

const page = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState('1');

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(employeeOnboardingValidation[activeTab]),
  });

  return (
    <div className="h-full w-full flex flex-col">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key?.toString())}
        color="primary"
        variant="underlined"
        className="mb-5"
        size="lg"
      >
        {tabs.map((tab) => {
          const isDisabled = tab.key === '2' && isLocked;

          return (
            <Tab
              key={tab.key}
              disabled={isDisabled}
              title={
                <div className="flex items-center space-x-2">
                  <span>{tab.title}</span>
                  {isDisabled && <TbLockBitcoin size={16} className="text-default-400" />}
                </div>
              }
              className="font-medium disabled:cursor-not-allowed"
            />
          );
        })}
      </Tabs>

      <div className="mx-4">
        {activeTab === '1' && (
          <BasicDetails
            reset={reset}
            errors={errors}
            control={control}
            isSubmitting={isSubmitting}
            setActiveTab={setActiveTab}
            handleSubmit={handleSubmit}
            enableSection={() => setIsLocked(false)}
          />
        )}

        {activeTab === '2' && (
          <CompanyDetails
            reset={reset}
            errors={errors}
            control={control}
            isSubmitting={isSubmitting}
            setActiveTab={setActiveTab}
            handleSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default page;

const tabs = [
  { key: '1', title: 'Basic Details' },
  { key: '2', title: 'Company Details' },
];
