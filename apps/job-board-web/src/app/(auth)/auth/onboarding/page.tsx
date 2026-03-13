'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { addToast, Tab, Tabs } from '@heroui/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { onboardingValidation } from '@/app/utils/validations';
import PersonalInformation from './steps/PersonalInformation';
import EducationDetails from './steps/EducationDetails';
import Skills from './steps/Skills';
import ExperienceDetails from './steps/ExperienceDetails';
import JobPreferences from './steps/JobPreferences';
import Certifications from './steps/Certifications';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';

dayjs.extend(customParseFormat);

const tabs = [
  { key: '1', title: 'Personal Information' },
  { key: '2', title: 'Education Details' },
  { key: '3', title: 'Skills' },
  { key: '4', title: 'Work Experience' },
  { key: '5', title: 'Job Preferences' },
  { key: '6', title: 'Certifications' },
];

const OnboardingContent = () => {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStep = params.get('step');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultStep || '1');

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(onboardingValidation[activeTab]),
  });

  const getProfileData = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
      const data = response?.data;
      if (data) {
        reset({
          ...data,
          summary: data?.professionalSummary,
        });
      }
    } catch (error) {
      console.error('Prefill Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfileData();
  }, []);

  const handleNext = () => {
    const next = parseInt(activeTab) + 1;
    setActiveTab(next.toString());
    router.push(`${routePaths.auth.onboarding}?step=${next}`);
  };

  const handleDataExtracted = async (data: any) => {
    try {
      setLoading(true);

      if (data.personalDetails) {
        const pd = data.personalDetails;
        if (pd.firstName) setValue('firstName', pd.firstName);
        if (pd.lastName) setValue('lastName', pd.lastName);
        if (pd.email) setValue('email', pd.email);
        if (pd.phoneNumber) setValue('phone', pd.phoneNumber);
        if (pd.country) setValue('country', pd.country);
        if (pd.state) setValue('state', pd.state);
        if (pd.city) setValue('city', pd.city);
        if (pd.headline) setValue('headline', pd.headline);
        if (pd.profileSummary) setValue('summary', pd.profileSummary);

        try {
          await http.put(ENDPOINTS.CANDIDATE.UPDATE_PROFILE, {
            firstName: pd.firstName,
            lastName: pd.lastName,
            headline: pd.headline,
            summary: pd.profileSummary,
            locationCity: pd.city,
            locationState: pd.state,
            locationCountry: pd.country,
          });
        } catch (error) {
          console.log(error);
        }
      }

      if (data.educationalDetails?.length > 0) {
        for (const edu of data.educationalDetails) {
          try {
            const endDateValue = edu.endDate || edu.yearOfCompletion;
            const endDateParsed = endDateValue
              ? dayjs(endDateValue, ['MM/YYYY', 'YYYY', 'MM-YYYY', 'YYYY-MM-DD'])
              : dayjs();
            const endDate = endDateParsed.isValid()
              ? endDateParsed.format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD');

            const startDateValue = edu.startDate;
            const startDateParsed = startDateValue
              ? dayjs(startDateValue, ['MM/YYYY', 'YYYY', 'MM-YYYY', 'YYYY-MM-DD'])
              : dayjs(endDate).subtract(3, 'year');
            const startDate = startDateParsed.isValid()
              ? startDateParsed.format('YYYY-MM-DD')
              : dayjs(endDate).subtract(3, 'year').format('YYYY-MM-DD');

            await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, {
              degree: edu.degree,
              institution: edu.institutionName,
              startDate,
              endDate,
            });
          } catch (e) {
            console.log('Education Add Error:', e);
          }
        }
      }

      if (data.experienceDetails?.length > 0) {
        for (const exp of data.experienceDetails) {
          try {
            const startDateValue = exp.startDate || exp.duration?.split('-')[0]?.trim();
            const endDateValue = exp.endDate || exp.duration?.split('-')[1]?.trim();

            const startDateParsed = startDateValue
              ? dayjs(startDateValue, ['MM/YYYY', 'YYYY', 'MM-YYYY', 'YYYY-MM-DD'])
              : dayjs();
            const startDate = startDateParsed.isValid()
              ? startDateParsed.format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD');

            const isCurrent =
              endDateValue?.toLowerCase() === 'present' ||
              exp.endDate === 'Present' ||
              !endDateValue;
            const endDateParsed = isCurrent
              ? dayjs()
              : dayjs(endDateValue, ['MM/YYYY', 'YYYY', 'MM-YYYY', 'YYYY-MM-DD']);
            const endDate = endDateParsed.isValid()
              ? endDateParsed.format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD');

            await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, {
              title: exp.jobTitle,
              designation: exp.jobTitle,
              companyName: exp.companyName,
              employmentType: 'full_time',
              startDate,
              endDate,
              isCurrent,
              description: Array.isArray(exp.description)
                ? exp.description.join('\n')
                : exp.description,
            });
          } catch (e) {
            console.log('Experience Add Error:', e);
          }
        }
      }

      if (data.skills?.technicalSkills?.length > 0) {
        for (const skill of data.skills.technicalSkills) {
          try {
            await http.post(ENDPOINTS.CANDIDATE.ADD_SKILL, {
              skillName: skill,
              proficiencyLevel: 'intermediate',
              yearsOfExperience: 1,
            });
          } catch (e) {
            console.log('Skill Add Error:', e);
          }
        }
      }

      await getProfileData();

      addToast({
        color: 'success',
        title: 'Resume Processed',
        description: 'Information has been extracted and pre-filled.',
      });
    } catch (error) {
      console.error('Data Extraction Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key.toString())}
        color="primary"
        variant="underlined"
        className="mb-5"
        size="lg"
      >
        {tabs.map((tab) => {
          return <Tab key={tab.key} className="font-medium" title={tab.title} />;
        })}
      </Tabs>

      {loading ? (
        <LoadingProgress />
      ) : (
        <>
          {activeTab === '1' && (
            <PersonalInformation
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
              onStructuredData={handleDataExtracted}
            />
          )}
          {activeTab === '2' && (
            <EducationDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === '3' && (
            <Skills
              errors={errors}
              control={control}
              setValue={setValue}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === '4' && (
            <ExperienceDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
            />
          )}
          {activeTab === '5' && (
            <JobPreferences
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
              handleNext={handleNext}
            />
          )}
          {activeTab === '6' && (
            <Certifications
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
            />
          )}
        </>
      )}
    </div>
  );
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingProgress />}>
      <OnboardingContent />
    </Suspense>
  );
}
