"use client";

import { Spinner } from "@heroui/react";

const LoadingProgress = () => {
  return (
    <div className="flex flex-col gap-2 items-center justify-center h-full w-full my-10">
      <Spinner size="lg" />
      <p className="text-sm">Please wait...</p>
    </div>
  );
};

export default LoadingProgress;
