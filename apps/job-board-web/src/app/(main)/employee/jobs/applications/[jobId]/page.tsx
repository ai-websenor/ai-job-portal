"use client";

import JobApplicantCard from "@/app/components/cards/JobApplicantCard";
import BackButton from "@/app/components/lib/BackButton";
import { jobApplicantsData } from "@/app/config/data";
import withAuth from "@/app/hoc/withAuth";
import usePagination from "@/app/hooks/usePagination";

const page = () => {
  const { renderPagination } = usePagination();

  return (
    <>
      <title>Applications | UI/UX Designer</title>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">
            UI/UX Designer Applicants
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          {jobApplicantsData.map((item) => (
            <JobApplicantCard key={item.id} {...item} />
          ))}
        </div>
        <div className="mt-12 flex justify-center">{renderPagination()}</div>
      </div>
    </>
  );
};

export default withAuth(page);
