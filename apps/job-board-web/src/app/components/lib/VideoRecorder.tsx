"use client";

import { Button } from "@heroui/react";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { IoPlayCircleOutline, IoStopCircleOutline } from "react-icons/io5";
import { useReactMediaRecorder } from "react-media-recorder-2";

type Props = {
  onVideoFileReady: (file: File) => void;
  onCancel: () => void;
  className?: string;
};

const VideoRecorder = ({ onVideoFileReady, onCancel, className }: Props) => {
  const { status, startRecording, stopRecording, previewStream } =
    useReactMediaRecorder({
      video: true,
      audio: true,
      onStop: (_, blob) => {
        const videoFile = new File([blob], "recorded-video.mp4", {
          type: "video/mp4",
          lastModified: Date.now(),
        });
        onVideoFileReady(videoFile);
      },
    });

  return (
    <div className={clsx("flex flex-col items-center gap-6 w-full", className)}>
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100">
        <VideoPreview stream={previewStream} />
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
          <div
            className={clsx(
              "w-3 h-3 rounded-full",
              status === "recording"
                ? "bg-danger animate-pulse"
                : "bg-gray-400",
            )}
          />
          <span className="text-white text-xs font-medium uppercase tracking-wider">
            {status}
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        {status !== "recording" ? (
          <Button
            color="primary"
            onPress={startRecording}
            startContent={<IoPlayCircleOutline size={22} />}
          >
            Start Recording
          </Button>
        ) : (
          <Button
            color="danger"
            onPress={stopRecording}
            startContent={<IoStopCircleOutline size={22} />}
          >
            Stop Recording
          </Button>
        )}

        <Button variant="light" onPress={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      className="w-full h-full object-cover"
    />
  );
};

export default VideoRecorder;
