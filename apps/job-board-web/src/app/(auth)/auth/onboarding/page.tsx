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
        // Coerce null → '' for all string fields to avoid React "value null" warnings
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
  }, []);

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

  const handleDataExtracted = async (data: any) => {
    try {
      setLoading(true);

      // 1. Prefill form fields immediately (no API call)
      if (data.personalDetails) {
        const pd = data.personalDetails;
        console.debug('[handleDataExtracted] personalDetails keys:', Object.keys(pd), pd);
        const matchedCountry: any = findCountryMatch(pd.country);
        const finalCountryName = matchedCountry ? matchedCountry.name : '';

        if (pd.firstName) setValue('firstName', pd.firstName);
        if (pd.lastName) setValue('lastName', pd.lastName);
        if (pd.country) setValue('country', finalCountryName);
        if (pd.state) setValue('state', pd.state);
        if (pd.city) setValue('city', pd.city);
        if (pd.headline) setValue('headline', pd.headline);
        if (pd.professionalSummary) setValue('summary', pd.professionalSummary);
        const gender = pd.gender?.toLowerCase();
        if (gender && ['male', 'female', 'other', 'not_specified'].includes(gender)) {
          setValue('gender', gender);
        }

        // URL fields — parser may return various key names
        const linkedinUrl = pd.linkedin || pd.linkedinUrl || pd.linkedin_url || pd.linkedIn || '';
        const githubUrl = pd.github || pd.githubUrl || pd.github_url || pd.gitHub || '';
        const websiteUrl = pd.website || pd.websiteUrl || pd.website_url || pd.portfolio || pd.portfolioUrl || '';
        if (linkedinUrl) setValue('linkedinUrl', linkedinUrl);
        if (githubUrl) setValue('githubUrl', githubUrl);
        if (websiteUrl) setValue('websiteUrl', websiteUrl);
      }

      // 2. Clear existing records before inserting parsed data
      try {
        const profile = await http.get(ENDPOINTS.CANDIDATE.PROFILE);
        const existing = profile?.data ?? profile;
        const deleteOps: Promise<void>[] = [];

        if (existing?.educationRecords?.length > 0) {
          for (const rec of existing.educationRecords) {
            deleteOps.push(
              http.delete(ENDPOINTS.CANDIDATE.DELETE_EDUCATION(rec.id))
                .catch((e: unknown) => console.debug('[handleDataExtracted] delete education:', e)),
            );
          }
        }
        if (existing?.workExperiences?.length > 0) {
          for (const rec of existing.workExperiences) {
            deleteOps.push(
              http.delete(ENDPOINTS.CANDIDATE.DELETE_EXPERIENCE(rec.id))
                .catch((e: unknown) => console.debug('[handleDataExtracted] delete experience:', e)),
            );
          }
        }
        if (existing?.profileSkills?.length > 0) {
          for (const rec of existing.profileSkills) {
            deleteOps.push(
              http.delete(ENDPOINTS.CANDIDATE.DELETE_SKILL(rec.skillId))
                .catch((e: unknown) => console.debug('[handleDataExtracted] delete skill:', e)),
            );
          }
        }
        if (existing?.certifications?.length > 0) {
          for (const rec of existing.certifications) {
            deleteOps.push(
              http.delete(ENDPOINTS.CANDIDATE.DELETE_CERTIFICATION(rec.id))
                .catch((e: unknown) => console.debug('[handleDataExtracted] delete cert:', e)),
            );
          }
        }
        await Promise.all(deleteOps);
      } catch (e) {
        console.debug('[handleDataExtracted] clear existing records error:', e);
      }

      // 3. Save all sections to backend
      const saveOps: Promise<void>[] = [];

      // Profile update
      if (data.personalDetails) {
        const pd = data.personalDetails;
        const linkedinVal = pd.linkedin || pd.linkedinUrl || pd.linkedin_url || pd.linkedIn || undefined;
        const githubVal = pd.github || pd.githubUrl || pd.github_url || pd.gitHub || undefined;
        const websiteVal = pd.website || pd.websiteUrl || pd.website_url || pd.portfolio || pd.portfolioUrl || undefined;
        saveOps.push(
          http.put(ENDPOINTS.CANDIDATE.UPDATE_PROFILE, {
            firstName: pd.firstName,
            lastName: pd.lastName,
            headline: pd.headline,
            summary: pd.professionalSummary,
            locationCity: pd.city,
            locationState: pd.state,
            locationCountry: pd.country,
            gender: pd.gender?.toLowerCase() || undefined,
            linkedinUrl: linkedinVal,
            githubUrl: githubVal,
            websiteUrl: websiteVal,
          }).then(() => {}).catch((e: unknown) => console.debug('[handleDataExtracted] profile error:', e)),
        );
      }

      // Education — sequential to avoid overlap check race condition
      if (data.educationalDetails?.length > 0) {
        saveOps.push(
          (async () => {
            for (const edu of data.educationalDetails) {
              try {
                await http.post(ENDPOINTS.CANDIDATE.ADD_EDUCATION, {
                  degree: edu.degree,
                  institution: edu.institution,
                  fieldOfStudy: edu.fieldOfStudy || '',
                  startDate: edu.startDate || null,
                  endDate: edu.endDate || null,
                  grade: edu.grade || '',
                  currentlyStudying: edu.currentlyStudying || false,
                });
              } catch (e: unknown) {
                console.debug('[handleDataExtracted] education skipped (duplicate/overlap):', e);
              }
            }
          })(),
        );
      }

      // Experience — sequential to avoid overlap/duplicate issues
      if (data.experienceDetails?.length > 0) {
        saveOps.push(
          (async () => {
            for (const exp of data.experienceDetails) {
              try {
                await http.post(ENDPOINTS.CANDIDATE.ADD_EXPERIENCE, {
                  title: exp.title,
                  designation: exp.designation || exp.title,
                  companyName: exp.companyName,
                  employmentType: exp.employmentType || 'full_time',
                  startDate: exp.startDate || null,
                  endDate: exp.isCurrent ? null : (exp.endDate || null),
                  isCurrent: exp.isCurrent || false,
                  location: exp.location || '',
                  description: exp.description || '',
                  achievements: exp.achievements || '',
                  skillsUsed: exp.skillsUsed || '',
                });
              } catch (e: unknown) {
                console.debug('[handleDataExtracted] experience skipped (duplicate/overlap):', e);
              }
            }
          })(),
        );
      }

      // Skills — single bulk endpoint instead of N individual calls
      if (data.skills?.length > 0) {
        const skills = data.skills.map((skill: any) => ({
          skillName: typeof skill === 'string' ? skill : skill.skillName,
          proficiencyLevel: skill.proficiencyLevel || 'intermediate',
          yearsOfExperience: skill.yearsOfExperience || null,
        }));
        saveOps.push(
          http.post(ENDPOINTS.CANDIDATE.BULK_ADD_SKILLS, { skills })
            .then(() => {}).catch((e: unknown) => console.debug('[handleDataExtracted] bulk skills error:', e)),
        );
      }

      // Certifications — all entries in parallel
      if (data.certifications?.length > 0) {
        saveOps.push(
          Promise.all(
            data.certifications.map((cert: any) =>
              http.post(ENDPOINTS.CANDIDATE.ADD_CERTIFICATION, {
                name: cert.name,
                issuingOrganization: cert.issuingOrganization || '',
                issueDate: cert.issueDate || null,
                expiryDate: cert.expiryDate || null,
                credentialId: cert.credentialId || '',
                credentialUrl: cert.credentialUrl || '',
              }).catch((e: unknown) => console.debug('[handleDataExtracted] certification error:', e)),
            ),
          ).then(() => undefined),
        );
      }

      await Promise.all(saveOps);
      await getProfileData();

      // Re-apply parsed values after getProfileData reset() — ensures parsed data wins
      // even if the profile PUT partially failed
      if (data.personalDetails) {
        const pd = data.personalDetails;
        const matchedCountry: any = findCountryMatch(pd.country);
        if (pd.firstName) setValue('firstName', pd.firstName);
        if (pd.lastName) setValue('lastName', pd.lastName);
        if (pd.country) setValue('country', matchedCountry ? matchedCountry.name : '');
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
        const websiteUrl = pd.website || pd.websiteUrl || pd.website_url || pd.portfolio || pd.portfolioUrl || '';
        if (linkedinUrl) setValue('linkedinUrl', linkedinUrl);
        if (githubUrl) setValue('githubUrl', githubUrl);
        if (websiteUrl) setValue('websiteUrl', websiteUrl);
      }

      addToast({
        color: 'success',
        title: 'Resume Processed',
        description: 'Information has been extracted and pre-filled.',
      });
    } catch (error) {
      console.debug('[handleDataExtracted] error:', error);
    } finally {
      setLoading(false);
    }
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
