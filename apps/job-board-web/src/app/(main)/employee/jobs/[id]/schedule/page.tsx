"use client";

import BackButton from "@/app/components/lib/BackButton";
import withAuth from "@/app/hoc/withAuth";
import ScheduleInterviewForm from "./ScheduleInterviewForm";

const page = () => {
  return (
    <>
      <title>Schedule Interview</title>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">
            Schedule Interview
          </h1>
        </div>
        <ScheduleInterviewForm />
      </div>
    </>
  );
};

export default withAuth(page);
