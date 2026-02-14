"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import SavedJobCard from "@/app/components/cards/SavedJobCard";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import usePagination from "@/app/hooks/usePagination";
import { IJob } from "@/app/types/types";
import { useEffect, useState } from "react";
import { MdPendingActions } from "react-icons/md";

const page = () => {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [jobs, setJobs] = useState<IJob[]>([]);

  const getJobs = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.JOBS.SAVED, {
        params: {
          page,
          limit: 10,
        },
      });
      if (response?.data) {
        setJobs(response?.data);
        setTotalPages(response?.pagination?.pageCount ?? 1);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, [page]);

  return (
    <>
      <title>Saved Jobs</title>
      <div className="container w-full p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>
        {loading ? (
          <LoadingProgress />
        ) : jobs?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
            {jobs?.map((job) => (
              <SavedJobCard key={job?.id} job={job} refetch={getJobs} />
            ))}
          </div>
        ) : (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 text-center text-gray-400">
            <MdPendingActions className="mx-auto text-4xl mb-2 opacity-50" />
            <p>No jobs found in this category.</p>
          </div>
        )}
        {jobs?.length > 0 && renderPagination()}
      </div>
    </>
  );
};

export default page;
