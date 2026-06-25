'use client';

import InterviewListTable from '@/app/(main)/employee/interviews/InterviewListTable';
import withCandidateAuth from '@/app/hoc/withCandidateAuth';

const Page = () => {
  return (
    <>
      <title>My Interviews</title>
      <div className="container mx-auto w-full px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-950">My Interviews</h1>
          <p className="mt-1 text-sm text-gray-500">Track upcoming and completed rounds.</p>
        </div>

        <InterviewListTable />
      </div>
    </>
  );
};

export default withCandidateAuth(Page);

