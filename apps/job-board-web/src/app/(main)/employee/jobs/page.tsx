"use client";

import { Button } from "@heroui/react";
import { MdAdd } from "react-icons/md";
import JobsListTable from "./JobsListTable";
import { useRouter } from "next/navigation";
import routePaths from "@/app/config/routePaths";

const page = () => {
  const router = useRouter();

  return (
    <>
      <title>Jobs</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex justify-between gap-5 items-center mb-6">
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <Button
            color="primary"
            startContent={<MdAdd size={20} />}
            onPress={() => router.push(routePaths.employee.jobs.create)}
          >
            Job Post
          </Button>
        </div>
        <JobsListTable />
      </div>
    </>
  );
};

export default page;
