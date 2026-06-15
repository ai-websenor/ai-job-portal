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
  const [isBasicDetailsSaved, setIsBasicDetailsSaved] = useState(false);
  const [completeApiError, setCompleteApiError] = useState('');

  const {
    reset: resetCompanyForm,
    control: companyControl,
    setValue: setCompanyValue,
    handleSubmit: handleCompanySubmit,
    watch: watchCompanyForm,
    formState: { errors: companyErrors, isSubmitting: isCompanySubmitting },
  } = useForm({
    resolver: yupResolver(employeeOnboardingValidation['1']),
    shouldUnregister: false,
  });

  const {
    reset: resetBasicForm,
    control: basicControl,
    setValue: setBasicValue,
    handleSubmit: handleBasicSubmit,
    formState: { errors: basicErrors, isSubmitting: isBasicSubmitting },
  } = useForm({
    resolver: yupResolver(employeeOnboardingValidation['2']),
    shouldUnregister: false,
  });

  const companyFormValues = watchCompanyForm();

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
          <CompanyDetails
            reset={resetCompanyForm}
            errors={companyErrors}
            control={companyControl}
            setValue={setCompanyValue}
            isSubmitting={isCompanySubmitting}
            setActiveTab={setActiveTab}
            handleSubmit={handleCompanySubmit}
            completeApiError={completeApiError}
            setCompleteApiError={setCompleteApiError}
            enableSection={() => setIsLocked(false)}
          />
        )}

        {activeTab === '2' && (
          <BasicDetails
            reset={resetBasicForm}
            errors={basicErrors}
            control={basicControl}
            setValue={setBasicValue}
            isSubmitting={isBasicSubmitting}
            setActiveTab={setActiveTab}
            handleSubmit={handleBasicSubmit}
            isBasicDetailsSaved={isBasicDetailsSaved}
            setIsBasicDetailsSaved={setIsBasicDetailsSaved}
            setCompleteApiError={setCompleteApiError}
            companyDetails={companyFormValues}
          />
        )}
      </div>
    </div>
  );
};

export default page;

const tabs = [
  { key: '1', title: 'Company Details' },
  { key: '2', title: 'Basic Details' },
];
