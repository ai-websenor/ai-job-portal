"use client";

import { useEffect, useState } from "react";
import ENDPOINTS from "../api/endpoints";
import http from "../api/http";
import CompanySection from "../components/home/CompanySection";
import DownloadOurAppSection from "../components/home/DownloadOurAppSection";
import HeroSection from "../components/home/HeroSection";
import PopularJobsSection from "../components/home/PopularJobsSection";
import TrendingJobsSection from "../components/home/TrendingJobsSection";
import { IJob } from "../types/types";
import useLocalStorage from "../hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import routePaths from "../config/routePaths";

async function page() {
  const router = useRouter();
  const { getLocalStorage } = useLocalStorage();
  const [trendingJobs, setTrendingJobs] = useState<IJob[]>([]);
  const [popularJobs, setPopularJobs] = useState<IJob[]>([]);

  const token = getLocalStorage("token");

  const fetchTrendingJobs = async () => {
    try {
      const response = await http.get(ENDPOINTS.JOBS.TRENDING, {
        params: { page: 1, limit: 4 },
      });
      setTrendingJobs(response?.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPopularJobs = async () => {
    try {
      const response = await http.get(ENDPOINTS.JOBS.POPULAR, {
        params: { page: 1, limit: 4 },
      });
      setPopularJobs(response?.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (token) {
      router.push(routePaths.dashboard);
      return;
    }
    fetchTrendingJobs();
    fetchPopularJobs();
  }, []);

  return (
    <div>
      <HeroSection />
      <CompanySection />
      {trendingJobs?.length > 0 && <TrendingJobsSection jobs={trendingJobs} />}
      {popularJobs?.length > 0 && <PopularJobsSection jobs={popularJobs} />}
      <DownloadOurAppSection />
    </div>
  );
}

export default page;
