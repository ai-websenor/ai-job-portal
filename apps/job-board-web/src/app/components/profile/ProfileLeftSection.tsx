"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import routePaths from "@/app/config/routePaths";
import useGetProfile from "@/app/hooks/useGetProfile";
import useUserStore from "@/app/store/useUserStore";
import CommonUtils from "@/app/utils/commonUtils";
import { Avatar, Card, CardBody, CircularProgress } from "@heroui/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { FiEdit3 } from "react-icons/fi";
import { GoArrowUpRight } from "react-icons/go";
import LoadingProgress from "../lib/LoadingProgress";
import AvatarSection from "./AvatarSection";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const ProfileLeftSection = ({ activeTab, setActiveTab }: Props) => {
  const router = useRouter();
  const { user } = useUserStore();
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);

  const handleChangeTab = (value: string) => {
    setActiveTab(value);
    router.push(`${routePaths.profile}?tab=${value}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  };

  const handleProfilePhotoChange = async (
    ev: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (loading) return;
    const file = ev.target?.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        await http.post(ENDPOINTS.CANDIDATE.PROFILE_PHOTO, formData);
        getProfile();
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full lg:max-w-[320px]">
      <div className="flex flex-col items-center justify-center text-center pb-2">
        <label className="relative mb-3 cursor-pointer">
          <Avatar
            src={user?.profilePhoto}
            className="w-36 h-36"
            isBordered
            color="primary"
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePhotoChange}
          />
          {loading && <LoadingProgress />}
          <div className="absolute bottom-0 right-0 bg-primary/20 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
            <FaRegEdit className="text-white text-sm" />
          </div>
        </label>
        <h2 className="text-lg font-bold text-gray-900">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          {user?.headline || "N/A"}
        </p>
      </div>

      <AvatarSection />

      <Card className="w-full shadow-none border border-gray-100 bg-white">
        <CardBody className="flex flex-row items-center gap-4 p-4">
          <CircularProgress
            aria-label="Profile Completion"
            size="lg"
            value={user?.completionPercentage}
            color="primary"
            showValueLabel={true}
            classNames={{
              svg: "w-14 h-14 drop-shadow-sm",
              indicator: "stroke-primary",
              track: "stroke-primary/10",
              value: "text-[10px] font-bold text-gray-800",
            }}
          />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 text-sm">
                Profile Completion
              </h3>
              <GoArrowUpRight className="text-gray-900 text-base cursor-pointer" />
            </div>
            <p className="text-xs text-gray-400">
              Updated {CommonUtils.determineDays(user?.updatedAt ?? "")}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-3">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Card
              isPressable
              key={tab.key}
              onPress={() => handleChangeTab(tab.key)}
              className={clsx(
                "w-full shadow-none border border-gray-200 hover:border-primary bg-white transition-all duration-200",
                { "border-2 border-primary": isActive },
              )}
            >
              <CardBody className="flex flex-row items-center justify-between p-3.5">
                <span className="text-sm font-semibold text-gray-700">
                  {tab.label}
                </span>
                <div className="bg-primary/5 p-1.5 rounded-lg text-primary">
                  <FiEdit3 className="text-base" />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileLeftSection;

const tabs = [
  {
    key: "1",
    label: "Personal Information",
  },
  {
    key: "2",
    label: "Education Details",
  },
  {
    key: "3",
    label: "Skills",
  },
  {
    key: "4",
    label: "Experience Details",
  },
  {
    key: "5",
    label: "Resume",
  },
  {
    key: "6",
    label: "Video Resume",
  },
  {
    key: "7",
    label: "Job Preferences",
  },
];
