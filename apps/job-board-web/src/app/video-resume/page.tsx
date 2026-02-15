"use client";

import FooterSection from "./FooterSection";
import HeaderSection from "./HeaderSection";
import ActionButtons from "./ActionButtons";
import { useState } from "react";
import VideoPreviewSection from "./VideoPreviewSection";
import http from "../api/http";
import ENDPOINTS from "../api/endpoints";
import LoadingProgress from "../components/lib/LoadingProgress";
import { uploadToS3 } from "../utils/s3Upload";
import dynamic from "next/dynamic";

const VideoRecorder = dynamic(() => import("../components/lib/VideoRecorder"), {
  ssr: false,
  loading: () => <LoadingProgress />,
});

const page = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [video, setVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleUpload = async () => {
    if (!video) return;
    try {
      setLoading(true);
      setUploadProgress(0);

      // Step 1: Upload to S3 via presigned URL
      const { key } = await uploadToS3({
        file: video,
        category: "video-profile",
        onProgress: setUploadProgress,
      });

      // Step 2: Confirm upload with backend
      await http.post(ENDPOINTS.RESUME_VIDEO.CONFIRM, {
        key,
        fileName: video.name,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="h-screen w-full bg-white p-10">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <LoadingProgress />
          {uploadProgress > 0 && (
            <p className="text-sm text-gray-500">Uploading... {uploadProgress}%</p>
          )}
        </div>
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
