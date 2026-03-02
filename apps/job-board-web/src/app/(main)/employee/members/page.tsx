"use client";

import routePaths from "@/app/config/routePaths";
import withAuth from "@/app/hoc/withAuth";
import { Button } from "@heroui/react";
import Link from "next/link";
import { MdAdd } from "react-icons/md";
import MembersListTable from "./MembersListTable";

const page = () => {
  return (
    <>
      <title>Members</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex justify-between gap-5 items-center mb-6">
          <h1 className="text-2xl font-bold">Members</h1>
          <Button
            as={Link}
            color="primary"
            startContent={<MdAdd size={20} />}
            href={routePaths.employee.members.create}
          >
            Add Member
          </Button>
        </div>
        <MembersListTable />
      </div>
    </>
  );
};

export default withAuth(page);
