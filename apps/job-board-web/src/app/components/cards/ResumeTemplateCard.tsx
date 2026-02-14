"use client";

import { ITemplate } from "@/app/types/types";
import { Button, Chip, Image } from "@heroui/react";
import { FaEye } from "react-icons/fa";

const ResumeTemplateCard = ({
  name,
  thumbnailUrl,
  isPremium,
  templateType,
}: ITemplate) => {
  const handleOpen = () => {
    if (typeof window !== "undefined") {
      window.open(thumbnailUrl, "_blank");
    }
  };

  return (
    <div className="w-full h-[380px] mb-14 sm:mb-0 group relative border-none cursor-pointer">
      {isPremium && (
        <Chip
          variant="shadow"
          size="sm"
          color="primary"
          className="absolute z-10 top-2 right-2"
        >
          Premium
        </Chip>
      )}

      <Image
        alt={name}
        removeWrapper
        src={thumbnailUrl}
        className="z-0 w-full h-full border"
      />

      <div className="rounded-xl absolute inset-0 bg-black/40 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
        <Button
          className="text-white bg-white/20 backdrop-blur-md border-white font-medium"
          variant="bordered"
          radius="full"
          startContent={<FaEye />}
          onPress={handleOpen}
        >
          Preview Template
        </Button>
      </div>

      <div className="space-y-1 text-center my-2 mb-5">
        <p className=" font-bold text-sm truncate w-full">{name}</p>
        <p className=" text-xs truncate w-full">{templateType}</p>
      </div>
    </div>
  );
};

export default ResumeTemplateCard;
