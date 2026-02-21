"use client";

import routePaths from "@/app/config/routePaths";
import useUserStore from "@/app/store/useUserStore";
import { Avatar, Button, Card, CardBody } from "@heroui/react";
import Link from "next/link";
import { FaUserTie } from "react-icons/fa";
import { FiDownload, FiEye } from "react-icons/fi";
import { LuUsers } from "react-icons/lu";
import { MdAdd } from "react-icons/md";

const EmployeeProfileCard = () => {
  const { user } = useUserStore();

  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary/10 to-secondary/10 w-full absolute top-0 left-0 z-0"></div>
      <CardBody className="flex flex-col items-center text-center gap-4 pt-12 relative z-10 p-6">
        <div className="p-1.5 rounded-full bg-white shadow-sm">
          <Avatar
            src={user?.profilePhoto}
            className="w-24 h-24 text-large border-4 border-white shadow-sm"
            isBordered
            color="primary"
          />
        </div>
        <div className="flex flex-col mt-2">
          <h2 className="text-xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h2>
          <div className="text-xs text-center text-gray-400">{user?.email}</div>
          <div className="px-4 flex justify-center items-center gap-1 mt-3">
            <Avatar
              src={user?.company?.logoUrl!}
              color="primary"
              className="w-6 h-6"
            />
            <p className="text-sm text-gray-500 font-medium">
              {user?.company?.name}
            </p>
          </div>
        </div>

        <div className="w-full border p-5 rounded-lg">
          <h3 className="font-medium text-left">Hiring Stats</h3>

          <div className="flex flex-col gap-3 mt-3">
            {data?.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-secondary rounded-2xl cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <item.icon size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {item.title}
                    </span>
                    <span className="text-xl font-bold text-gray-800">7</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          as={Link}
          href={routePaths.employee.members.create}
          startContent={<MdAdd size={20} />}
          color="primary"
          fullWidth
        >
          Add Member
        </Button>
      </CardBody>
    </Card>
  );
};

export default EmployeeProfileCard;

const data = [
  {
    icon: FiEye,
    title: "Job Views",
    value: "152",
  },
  {
    icon: LuUsers,
    title: "Applications",
    value: "7",
  },
  {
    icon: FiDownload,
    title: "Conversion Rate",
    value: "23",
  },
];
