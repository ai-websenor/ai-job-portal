"use client";

import { useRouter } from "next/navigation";
import { IoArrowBackOutline } from "react-icons/io5";

const BackButton = ({ showLabel = false }: { showLabel?: boolean }) => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center gap-2"
    >
      <IoArrowBackOutline size={20} />
      {showLabel && (
        <p className="text-sm font-medium text-gray-800">Go Back</p>
      )}
    </button>
  );
};

export default BackButton;
