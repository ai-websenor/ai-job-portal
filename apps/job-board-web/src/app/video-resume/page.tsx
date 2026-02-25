"use client";

import FooterSection from "./FooterSection";
import HeaderSection from "./HeaderSection";
import ActionButtons from "./ActionButtons";
import { useState } from "react";
import VideoPreviewSection from "./VideoPreviewSection";
import http from "../api/http";
import ENDPOINTS from "../api/endpoints";
import LoadingProgress from "../components/lib/LoadingProgress";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import routePaths from "../config/routePaths";
import { addToast, Button } from "@heroui/react";
import { IoMdArrowForward } from "react-icons/io";
import Link from "next/link";
import CommonUtils from "../utils/commonUtils";
import APP_CONFIG from "../config/config";
import useUploadVideoResume from "../hooks/useUploadVideoResume";

const VideoRecorder = dynamic(() => import("../components/lib/VideoRecorder"), {
  ssr: false,
  loading: () => <LoadingProgress />,
});

const page = () => {
  const router = useRouter();
  const [video, setVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const { loading, handleUpload } = useUploadVideoResume(() => {
    setVideo(null);
    router.push(routePaths.dashboard);
  });

  const onUpload = async () => {
    if (!video) return;

    const duration = await CommonUtils.getVideoDurationByUrl(
      URL.createObjectURL(video),
    );

    if (
      duration < APP_CONFIG.RESUME_VIDEO_CONFIGS.MIN_DURATION ||
      duration > APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_DURATION
    ) {
      addToast({
        title: "Oops",
        color: "danger",
        description: APP_CONFIG.RESUME_VIDEO_CONFIGS.ALERT,
      });
      return;
    }

    const bytes = video.size;
    const size = (bytes / (1024 * 1024)).toFixed(2);

    if (Number(size) > APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_SIZE) {
      addToast({
        title: "Oops",
        color: "danger",
        description: `Video can not be greater than ${APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_SIZE}`,
      });
      return;
    }

    handleUpload({
      duration,
      video,
    });
  };

  return (
    <div className="h-screen w-full bg-white p-10">
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container flex flex-col items-center justify-center h-full gap-5 xl:gap-10 relative">
          <Button
            as={Link}
            href={routePaths.dashboard}
            className="absolute top-0 right-0"
            endContent={<IoMdArrowForward size={15} />}
          >
            Skip
          </Button>

          <HeaderSection />

          {video ? (
            <VideoPreviewSection
              video={video}
              onUpload={onUpload}
              onRemove={() => setVideo(null)}
            />
          ) : isRecording ? (
            <VideoRecorder
              className="max-w-full sm:max-w-[70%]"
              onCancel={() => setIsRecording(false)}
              onVideoFileReady={(video) => {
                setVideo(video);
                setIsRecording(false);
              }}
            />
          ) : (
            <>
              <ActionButtons
                setVideo={setVideo}
                startRecording={() => setIsRecording(true)}
              />
              <FooterSection />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default page;
