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

const VideoRecorder = dynamic(() => import("../components/lib/VideoRecorder"), {
  ssr: false,
  loading: () => <LoadingProgress />,
});

const page = () => {
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleUpload = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.RESUME_VIDEO.UPLOAD, {
        video,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white p-10">
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container flex flex-col items-center justify-center h-full gap-5 xl:gap-10">
          <HeaderSection />
          {video ? (
            <VideoPreviewSection
              video={video}
              onUpload={handleUpload}
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
