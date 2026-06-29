'use client';

import { use, useEffect, useState } from 'react';
import { getCandidateProfile } from '@/app/api/candidateSearch';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import withAuth from '@/app/hoc/withAuth';
import type { CandidateProfileResponse } from '@/app/types/candidateSearch';
import ApplicantDetails from '../../jobs/[id]/applications/[applicantId]/ApplicantDetails';

const Page = ({ params }: { params: Promise<{ profileId: string }> }) => {
  const { profileId } = use(params);
  const [loading, setLoading] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const candidateName =
    [candidateProfile?.profile?.firstName, candidateProfile?.profile?.lastName]
      .filter(Boolean)
      .join(' ') || 'Candidate';

  const getDetails = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await getCandidateProfile(profileId);
      setCandidateProfile(response?.data ?? null);
    } catch (error) {
      setCandidateProfile(null);
      setErrorMessage(
        (error as { message?: string })?.message || 'Candidate not found or profile is private.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDetails();
  }, [profileId]);

  return (
    <>
      <title>{candidateName} | Candidate Profile</title>

      {loading ? (
        <LoadingProgress />
      ) : candidateProfile ? (
        <div className="container mx-auto p-6 space-y-6">
          <BackButton showLabel />
          <ApplicantDetails {...candidateProfile} profileId={profileId} refetch={getDetails} />
        </div>
      ) : (
        <div className="container mx-auto p-6">
          <BackButton showLabel />
          {errorMessage && (
            <p className="mb-4 text-center text-sm font-medium text-default-500">
              {errorMessage}
            </p>
          )}
          <NoDataFound />
        </div>
      )}
    </>
  );
};

export default withAuth(Page);
