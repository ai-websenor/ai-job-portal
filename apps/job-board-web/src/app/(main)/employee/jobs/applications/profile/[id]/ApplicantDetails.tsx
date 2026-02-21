"use client";

import { Card, CardHeader, CardBody, Button, Avatar } from "@heroui/react";
import { FaFilePdf } from "react-icons/fa";
import { HiOutlineDownload } from "react-icons/hi";
import { BsChatText } from "react-icons/bs";
import { applicantProfile } from "@/app/config/data";
import Link from "next/link";
import routePaths from "@/app/config/routePaths";

type Props = {
  profile: typeof applicantProfile;
};

const ApplicantDetails = ({ profile }: Props) => {
  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-md border-none bg-white p-4">
        <CardBody className="flex flex-row flex-wrap items-start justify-between gap-6">
          <div className="flex sm:flex-row flex-col items-center gap-6">
            <Avatar
              src={profile.profilePhoto}
              className="w-24 h-24 text-large"
              radius="lg"
              isBordered
              color="primary"
            />
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-default-900">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-default-500 max-w-2xl leading-relaxed">
                {profile.headline}
              </p>
            </div>
          </div>
          <div className="flex sm:flex-row flex-col items-center gap-3 sm:w-fit w-full">
            <Button
              as={Link}
              href={routePaths.chat.list}
              color="primary"
              variant="flat"
              radius="lg"
              className="sm:w-fit w-full"
              startContent={<BsChatText size={20} />}
            >
              Chat
            </Button>
            <Button color="danger" radius="lg" className="sm:w-fit w-full">
              Reject
            </Button>
            <Button color="default" radius="lg" className="sm:w-fit w-full">
              Shortlist
            </Button>
            <Button
              as={Link}
              href={routePaths.employee.jobs.scheduleInterview(
                "sadfasf",
                "213jkslkfsf",
              )}
              color="primary"
              radius="lg"
              className="sm:w-fit w-full"
            >
              Schedule Interview
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Education</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 flex flex-row flex-wrap gap-x-12 gap-y-6">
            {profile.educations.map((edu, index) => (
              <div key={index} className="flex flex-col min-w-[140px]">
                <h3 className="font-bold text-default-800 text-base">
                  {edu.institution}
                </h3>
                <p className="text-default-400 text-sm mt-0.5">
                  {edu.startYear} - {edu.endYear}
                </p>
                <p className="text-default-500 text-sm font-semibold mt-0.5">
                  {edu.degree}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">
              Work Experience
            </h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 flex flex-row flex-wrap gap-x-12 gap-y-6">
            {profile.workExperience.map((exp, index) => (
              <div key={index} className="flex flex-col min-w-[180px]">
                <h3 className="font-bold text-default-800 text-base">
                  {exp.company}
                </h3>
                <p className="text-default-400 text-sm mt-0.5">
                  {exp.startDate} - {exp.endDate}
                </p>
                <p className="text-default-500 text-sm font-semibold mt-0.5">
                  {exp.position}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-8 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Skills</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
              {profile.skills.map((skill, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-default-500 font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-default-400" />
                  {skill}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="shadow-md border-none bg-white p-2">
          <CardHeader className="px-6 pt-6 flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-default-900">Resume</h2>
          </CardHeader>
          <CardBody className="px-6 pb-6 gap-6">
            <div className="flex-1 bg-default-50 rounded-2xl flex items-center justify-center py-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaFilePdf
                size={70}
                className="text-danger shadow-sm transition-transform group-hover:scale-110"
              />
            </div>
            <div className="flex items-center justify-between p-4 border-2 border-default-100 rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-danger-50 text-danger rounded-xl flex items-center justify-center">
                  <FaFilePdf size={24} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-default-800 truncate max-w-[200px]">
                    {profile.resumeUrl.split("/").pop()}
                  </span>
                  <span className="text-[11px] text-default-400 font-bold uppercase tracking-wider">
                    15 Oct, 2024 • 200 KB • PDF
                  </span>
                </div>
              </div>
              <Button
                isIconOnly
                variant="flat"
                color="primary"
                size="md"
                radius="full"
                className="bg-primary/10"
              >
                <HiOutlineDownload size={22} />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ApplicantDetails;
