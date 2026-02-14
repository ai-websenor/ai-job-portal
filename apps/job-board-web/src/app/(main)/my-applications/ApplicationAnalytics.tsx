"use client";

import StatsCard from "@/app/components/cards/StatsCard";
import { IApplication } from "@/app/types/types";
import { Card, CardBody, Chip } from "@heroui/react";
import { useMemo } from "react";
import { MdArrowOutward } from "react-icons/md";

const ApplicationAnalytics = ({
  applications,
}: {
  applications: IApplication[];
}) => {
  const stats = useMemo(() => {
    const total = applications?.length;
    const proceed = applications?.filter((app) =>
      ["screening", "assessment", "interview", "offered"].includes(app?.status),
    ).length;
    const accepted = applications?.filter((app) =>
      ["offered", "accepted"].includes(app?.status),
    ).length;
    const rejected = applications?.filter(
      (app) => app?.status === "rejected",
    ).length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return { total, proceed, accepted, rejected, acceptanceRate };
  }, [applications]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatsCard
        label="Submissions"
        value={stats?.total}
        color="text-primary"
      />
      <StatsCard label="Proceed" value={stats?.proceed} color="text-primary" />
      <StatsCard
        label="Accepted"
        value={stats?.accepted}
        color="text-primary"
      />
      <StatsCard label="Reject" value={stats?.rejected} color="text-primary" />

      <Card className="shadow-sm border-none bg-white col-span-1 sm:col-span-2 lg:col-span-1">
        <CardBody className="p-4 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Acceptance Rate
              </p>
              <div className="flex items-baseline mt-2 gap-2">
                <span className="text-4xl font-bold text-primary">
                  {stats?.acceptanceRate}%
                </span>
                <Chip size="sm" color="danger" variant="flat">
                  Below average
                </Chip>
              </div>
            </div>
            <div className="bg-primary p-1 rounded-full text-white">
              <MdArrowOutward />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Let's find out whats wrong with your applications
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default ApplicationAnalytics;
