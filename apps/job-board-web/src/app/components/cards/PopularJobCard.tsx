"use client";

import Image from "next/image";
import { Button, Chip } from "@heroui/react";
import { MdLocationOn, MdWork, MdOutlinePayments } from "react-icons/md";
import CommonUtils from "@/app/utils/commonUtils";
import { useRouter } from "next/navigation";
import routePaths from "@/app/config/routePaths";

type Props = {
  id: string;
  profile: string;
  companyName: string;
  location: string;
  title: string;
  tags: string[];
  role: string;
  salary: string;
  description: string;
  postedDate: string;
};

const PopularJobCard = ({
  profile,
  companyName,
  location,
  title,
  tags,
  role,
  salary,
  description,
  postedDate,
  id,
}: Props) => {
  const router = useRouter();

  return (
    <div className="max-w-[400px] border-1.5 border-secondary rounded-[24px] p-6 bg-white shadow-sm font-sans">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-black flex items-center justify-center">
          <Image
            src={profile || ""}
            alt={companyName}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">
            {companyName}
          </h3>
          <div className="flex items-center text-gray-500 text-sm gap-0.5">
            <MdLocationOn className="text-lg" />
            <span>{location}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <h2 className="text-2xl font-bold text-gray-800 leading-tight">
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Chip
              key={tag}
              variant="flat"
              size="sm"
              className="bg-gray-100 text-gray-600 font-bold px-2 py-3"
            >
              {tag}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <MdWork className="text-xl text-gray-400" />
          <span className="text-[15px] font-medium">{role}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MdOutlinePayments className="text-xl text-gray-400" />
          <span className="text-[15px] font-medium">{salary}</span>
        </div>
      </div>

      <p className="text-gray-600 text-[15px] leading-relaxed mb-8">
        {description}
      </p>

      <div className="flex items-center gap-6">
        <Button
          color="primary"
          onPress={() => router.push(routePaths.jobs.apply(id))}
        >
          Apply Now
        </Button>
        <span className="text-gray-500 text-[15px] font-medium">
          {CommonUtils.determineDays(postedDate)}
        </span>
      </div>
    </div>
  );
};

export default PopularJobCard;
