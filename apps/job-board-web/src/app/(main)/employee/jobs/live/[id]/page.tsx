"use client";

import { Button } from "@heroui/react";
import { IoClose, IoCheckmark } from "react-icons/io5";
import Link from "next/link";
import withAuth from "@/app/hoc/withAuth";
import routePaths from "@/app/config/routePaths";

const JobLivePage = () => {
  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-gray-50/50">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-16 relative flex flex-col items-center text-center">
        <button className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors group">
          <IoClose
            size={28}
            className="text-gray-400 group-hover:text-gray-900"
          />
        </button>

        <div className="w-24 h-24 md:w-32 md:h-32 bg-primary rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-primary/30 animate-in zoom-in duration-500">
          <IoCheckmark size={64} className="text-white" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 tracking-tight">
          Your job is live
        </h1>

        <p className="text-gray-500 text-lg md:text-xl max-w-sm mb-14 leading-relaxed">
          Your job posting for{" "}
          <span className="font-bold text-gray-900">UI/UX Designer</span> is now
          live and visible to job seekers.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-[280px]">
          <Button
            as={Link}
            variant="bordered"
            href={routePaths.employee.jobs.list}
            className="border-primary/30 text-primary font-bold py-7 text-lg rounded-2xl hover:bg-primary/5 transition-all"
          >
            Manage Other jobs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default withAuth(JobLivePage);
