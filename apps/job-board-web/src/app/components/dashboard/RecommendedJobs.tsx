"use client";

import { useEffect, useState } from "react";
import { IJob } from "@/app/types/types";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import { Button } from "@heroui/react";
import JobCard from "../cards/JobCard";
import Link from "next/link";
import routePaths from "@/app/config/routePaths";
import LoadingProgress from "../lib/LoadingProgress";

const RecommendedJobs = () => {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);

  const getJobs = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.JOBS.RECOMMENDED, {
        params: {
          page: 1,
          limit: 5,
        },
      });
      if (res?.data) {
        setJobs(res?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, []);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          Recommended Jobs for You
        </h2>
        {jobs?.length > 0 && (
          <Link
            href={routePaths.jobs.search}
            className="text-primary text-sm font-semibold hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingProgress />
          </div>
        ) : jobs?.length > 0 ? (
          jobs?.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">No Recommended Jobs Found</p>
            <Button
              color="primary"
              variant="flat"
              className="mt-4"
              onPress={() => window.location.reload()}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default RecommendedJobs;
