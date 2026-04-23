'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { addToast } from '@heroui/react';
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
import Stepper from '@/app/components/lib/Stepper';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';

const tabs = [
  { id: 1, title: 'Personal' },
  { id: 2, title: 'Education' },
  { id: 3, title: 'Skills' },
  { id: 4, title: 'Experience' },
  { id: 5, title: 'Preferences' },
  { id: 6, title: 'Certifications' },
];

const OnboardingContent = () => {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStep = params.get('step');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isResumeMode, setIsResumeMode] = useState(false);
  const { findCountryMatch } = useCountryStateCity();
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
        const safeData = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v === null ? '' : v]),
        );
        reset({
          ...safeData,
          summary: data?.professionalSummary ?? '',
          isCurrent: Boolean(data?.isCurrent),
          currentlyStudying: Boolean(data?.currentlyStudying),
          isMobileDisabled: data?.phone ? true : false,
        });
      }
    } catch (error) {
      console.log('Prefill Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfileData();
    getResumeParseData();
  }, []);

  const getResumeParseData = async () => {
    // Recover parsed data from DB on page reload
    const parsedId = localStorage.getItem('resume_parsed_id');
    if (parsedId && !parsedResumeRef.current) {
      http
        .get(ENDPOINTS.CANDIDATE.GET_PARSED_DATA(parsedId))
        .then((res: any) => {
          const data = res?.data;
          if (data) {
            console.debug('[onboarding] Recovered parsed data from DB:', parsedId);
            handleDataExtracted(data);
          }
        })
        .catch((e: any) => {
          console.debug('[onboarding] Failed to recover parsed data:', e);
          localStorage.removeItem('resume_parsed_id');
        });
    }
  };

  useEffect(() => {
    if (tabsRef.current) {
      const activeElement = tabsRef.current.querySelector(`[data-key="${activeTab}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeTab]);

  const handleBack = () => {
    const prev = Math.max(1, parseInt(activeTab) - 1);
    setActiveTab(prev.toString());
    router.push(`${routePaths.auth.onboarding}?step=${prev}`);
  };

  const handleNext = () => {
    const next = parseInt(activeTab) + 1;
    setActiveTab(next.toString());
    router.push(`${routePaths.auth.onboarding}?step=${next}`);
  };

  // Parsed resume data stored in-memory — no DB writes until user saves each step
  const parsedResumeRef = useRef<any>(null);
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());

  const getParsedSection = (section: string) => {
    if (savedSections.has(section)) return undefined;
    return parsedResumeRef.current?.[section];
  };

  const markSectionSaved = (section: string) => {
    setSavedSections((prev) => {
      const next = new Set([...prev, section]);
      // Clear DB key once all parseable sections are saved
      const allSections = ['educationalDetails', 'skills', 'experienceDetails', 'certifications'];
      if (allSections.every((s) => next.has(s))) {
        localStorage.removeItem('resume_parsed_id');
      }
      return next;
    });
    if (parsedResumeRef.current) {
      delete parsedResumeRef.current[section];
    }
  };

  const handleDataExtracted = (data: any) => {
    // Store full parsed data for downstream steps — NO API calls
    parsedResumeRef.current = {
      personalDetails: data.personalDetails || null,
      educationalDetails: data.educationalDetails || [],
      experienceDetails: data.experienceDetails || [],
      skills: data.skills || [],
      certifications: data.certifications || [],
    };
    setSavedSections(new Set());

    // Prefill personal info form fields only
    if (data.personalDetails) {
      const pd = data.personalDetails;
      console.debug('[handleDataExtracted] personalDetails keys:', Object.keys(pd), pd);
      const matchedCountry: any = findCountryMatch(pd.country);
      const finalCountryName = matchedCountry ? matchedCountry.name : '';

      if (pd.country) setValue('country', finalCountryName);
      if (pd.state) setValue('state', pd.state);
      if (pd.city) setValue('city', pd.city);
      if (pd.headline) setValue('headline', pd.headline);
      if (pd.professionalSummary) setValue('summary', pd.professionalSummary);
      const gender = pd.gender?.toLowerCase();
      if (gender && ['male', 'female', 'other', 'not_specified'].includes(gender)) {
        setValue('gender', gender);
      }

      const linkedinUrl = pd.linkedin || pd.linkedinUrl || pd.linkedin_url || pd.linkedIn || '';
      const githubUrl = pd.github || pd.githubUrl || pd.github_url || pd.gitHub || '';
      const websiteUrl =
        pd.website || pd.websiteUrl || pd.website_url || pd.portfolio || pd.portfolioUrl || '';
      if (linkedinUrl) setValue('linkedinUrl', linkedinUrl);
      if (githubUrl) setValue('githubUrl', githubUrl);
      if (websiteUrl) setValue('websiteUrl', websiteUrl);
    }

    addToast({
      color: 'success',
      title: 'Resume Processed',
      description: 'Review each section before saving.',
    });
  };

  return (
    <div className="h-full w-full flex flex-col gap-5">
      <Stepper
        steps={tabs}
        activeStep={Number(activeTab)}
        maxStepReached={6}
        disabled={isResumeMode}
        onStepClick={(stepId) => {
          setActiveTab(stepId.toString());
          router.push(`${routePaths.auth.onboarding}?step=${stepId}`);
        }}
      />

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
              isResumeMode={isResumeMode}
              onResumeModeChange={setIsResumeMode}
            />
          )}
          {activeTab === '2' && (
            <EducationDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleNext={handleNext}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              parsedRecords={getParsedSection('educationalDetails')}
              onParsedSaved={() => markSectionSaved('educationalDetails')}
            />
          )}
          {activeTab === '3' && (
            <Skills
              errors={errors}
              control={control}
              setValue={setValue}
              handleNext={handleNext}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              parsedRecords={getParsedSection('skills')}
              onParsedSaved={() => markSectionSaved('skills')}
            />
          )}
          {activeTab === '4' && (
            <ExperienceDetails
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleNext={handleNext}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              parsedRecords={getParsedSection('experienceDetails')}
              onParsedSaved={() => markSectionSaved('experienceDetails')}
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
              handleBack={handleBack}
            />
          )}
          {activeTab === '6' && (
            <Certifications
              errors={errors}
              control={control}
              setValue={setValue}
              refetch={getProfileData}
              handleSubmit={handleSubmit}
              handleBack={handleBack}
              parsedRecords={getParsedSection('certifications')}
              onParsedSaved={() => markSectionSaved('certifications')}
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
