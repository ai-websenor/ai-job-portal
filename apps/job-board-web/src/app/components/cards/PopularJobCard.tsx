"use client";

import Image from "next/image";
import { Button, Chip } from "@heroui/react";
import { MdLocationOn, MdWork, MdOutlinePayments } from "react-icons/md";
import CommonUtils from "@/app/utils/commonUtils";
import { useRouter } from "next/navigation";
import routePaths from "@/app/config/routePaths";
import APP_CONFIG from "@/app/config/config";

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
    <div className="flex flex-col h-full max-w-[400px] border-1.5 border-gray-100 rounded-[32px] p-8 bg-white shadow-sm font-sans hover:shadow-md transition-shadow">
      <div className="flex-grow">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-black shrink-0">
            <Image
              src={profile || ""}
              alt={companyName}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 leading-tight">
              {companyName}
            </h3>
            <div className="flex items-center text-gray-400 text-sm gap-0.5">
              <MdLocationOn className="text-lg" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 leading-[1.2] tracking-tight">
            {title}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 2).map((tag) => (
              <Chip
                key={tag}
                variant="flat"
                size="sm"
                className="bg-gray-50 text-gray-500 font-semibold px-2 py-4 border-none"
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-gray-600">
            <MdWork className="text-xl text-gray-300" />
            <span className="text-[15px] font-medium">
              {CommonUtils.keyIntoTitle(role)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MdOutlinePayments className="text-xl text-gray-300" />
            <span className="text-[15px] font-medium">
              {APP_CONFIG.CURRENCY}
              {salary}
            </span>
          </div>
        </div>

        <p className="text-gray-500 text-[15px] leading-relaxed line-clamp-2 mb-8 min-h-[3rem]">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <Button
          color="primary"
          onPress={() => router.push(routePaths.jobs.apply(id))}
        >
          Apply Now
        </Button>
        <span className="text-gray-400 text-[15px] font-medium">
          {CommonUtils.determineDays(postedDate)}
        </span>
      </div>
    </div>
  );
};

export default PopularJobCard;
