'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ApplicantDetails from './ApplicantDetails';
import { applicantProfile } from '@/app/config/data';

const page = () => {
  return (
    <>
      <title>Rahul Verma | Applicant Profile</title>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Rahul Verma</h1>
        </div>
        <ApplicantDetails profile={applicantProfile} />
      </div>
    </>
  );
};

export default withAuth(page);
