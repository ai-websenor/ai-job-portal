"use client";

import ShortlistedCard from "@/app/components/cards/ShortlistedCard";
import BackButton from "@/app/components/lib/BackButton";
import { shortlistedProfiles } from "@/app/config/data";
import withAuth from "@/app/hoc/withAuth";
import usePagination from "@/app/hooks/usePagination";

const page = () => {
  const { renderPagination } = usePagination();

  return (
    <>
      <title>Shortlisted Profiles</title>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">
            Shortlisted Profiles
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {shortlistedProfiles.map((item, index) => (
            <ShortlistedCard key={index} {...item} />
          ))}
        </div>
        {renderPagination()}
      </div>
    </>
  );
};

export default withAuth(page);
